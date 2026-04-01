export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export interface EmailLogger {
  log(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string): void;
}

export interface SendEmailProviderOptions {
  provider: string;
  from: string;
  replyTo?: string;
  resendApiKey?: string;
  postmarkServerToken?: string;
  postmarkMessageStream?: string;
  fetchImpl?: typeof fetch;
  logger: EmailLogger;
}

export interface EmailConfigReader {
  get<T>(key: string, defaultValue?: T): T | undefined;
}

export function createEmailProviderOptions(
  config: EmailConfigReader,
  logger: EmailLogger,
  fetchImpl: typeof fetch
): SendEmailProviderOptions {
  const replyTo = config.get<string | undefined>('EMAIL_REPLY_TO');
  const resendApiKey = config.get<string | undefined>('RESEND_API_KEY');
  const postmarkServerToken = config.get<string | undefined>('POSTMARK_SERVER_TOKEN');

  const options: SendEmailProviderOptions = {
    provider: config.get<string>('EMAIL_PROVIDER', 'console') ?? 'console',
    from: config.get<string>('EMAIL_FROM', 'Rifaria <no-reply@rifaria.local>') ?? '',
    postmarkMessageStream: config.get<string>('POSTMARK_MESSAGE_STREAM', 'outbound') ?? 'outbound',
    fetchImpl,
    logger
  };

  if (replyTo) {
    options.replyTo = replyTo;
  }

  if (resendApiKey) {
    options.resendApiKey = resendApiKey;
  }

  if (postmarkServerToken) {
    options.postmarkServerToken = postmarkServerToken;
  }

  return options;
}

export async function sendEmailWithProvider(
  options: SendEmailProviderOptions,
  input: SendEmailInput
): Promise<void> {
  if (options.provider === 'console') {
    options.logger.log(
      `EMAIL(console) from=${options.from} to=${input.to} subject=${input.subject}`
    );
    options.logger.debug(input.html);
    return;
  }

  if (options.provider === 'resend') {
    await sendWithResend(options, input);
    return;
  }

  if (options.provider === 'postmark') {
    await sendWithPostmark(options, input);
    return;
  }

  options.logger.warn(`Unknown EMAIL_PROVIDER='${options.provider}', fallback to console`);
  options.logger.log(
    `EMAIL(console-fallback) from=${options.from} to=${input.to} subject=${input.subject}`
  );
  options.logger.debug(input.html);
}

async function sendWithResend(
  options: SendEmailProviderOptions,
  input: SendEmailInput
): Promise<void> {
  if (!options.resendApiKey) {
    throw new Error('RESEND_API_KEY is required when EMAIL_PROVIDER=resend');
  }

  const response = await getFetchImpl(options.fetchImpl)('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: options.from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      ...(options.replyTo ? { reply_to: options.replyTo } : {})
    })
  });

  if (!response.ok) {
    const body = await extractErrorBody(response);
    options.logger.error(`Resend send failed status=${response.status} body=${body}`);
    throw new Error(`Resend request failed with status ${response.status}`);
  }

  options.logger.log(`EMAIL(resend) from=${options.from} to=${input.to} subject=${input.subject}`);
}

async function sendWithPostmark(
  options: SendEmailProviderOptions,
  input: SendEmailInput
): Promise<void> {
  if (!options.postmarkServerToken) {
    throw new Error('POSTMARK_SERVER_TOKEN is required when EMAIL_PROVIDER=postmark');
  }

  const response = await getFetchImpl(options.fetchImpl)('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': options.postmarkServerToken
    },
    body: JSON.stringify({
      From: options.from,
      To: input.to,
      Subject: input.subject,
      HtmlBody: input.html,
      MessageStream: options.postmarkMessageStream ?? 'outbound',
      ...(options.replyTo ? { ReplyTo: options.replyTo } : {})
    })
  });

  if (!response.ok) {
    const body = await extractErrorBody(response);
    options.logger.error(`Postmark send failed status=${response.status} body=${body}`);
    throw new Error(`Postmark request failed with status ${response.status}`);
  }

  options.logger.log(
    `EMAIL(postmark) from=${options.from} to=${input.to} subject=${input.subject}`
  );
}

async function extractErrorBody(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.slice(0, 1000);
  } catch {
    return 'unavailable';
  }
}

function getFetchImpl(fetchImpl?: typeof fetch): typeof fetch {
  if (!fetchImpl) {
    throw new Error('A fetch implementation is required for email delivery');
  }

  return fetchImpl;
}
