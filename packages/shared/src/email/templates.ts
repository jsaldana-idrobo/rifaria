export interface TicketEmailTemplatePayload {
  fullName: string;
  raffleTitle: string;
  rafflePrize: string;
  drawAt: Date;
  drawSource: string;
  ticketNumbers: string[];
  upcomingPrizeDraws: Array<{
    title: string;
    displayValue: string;
    drawAt: Date;
  }>;
}

export interface PostponeEmailTemplatePayload {
  fullName: string;
  raffleTitle: string;
  newDrawAt: Date;
  reason: string;
}

export function ticketEmailTemplate(payload: TicketEmailTemplatePayload): string {
  const ticketsHtml = payload.ticketNumbers
    .map(
      (ticket) =>
        `<span style="display:inline-block;margin:6px;padding:10px 14px;border-radius:999px;background:#111;color:#f6f3ee;font-weight:700;letter-spacing:0.08em;">${ticket}</span>`
    )
    .join('');
  const upcomingHtml =
    payload.upcomingPrizeDraws.length === 0
      ? `<p style="margin:0;color:#5c554a;">No hay mas premios programados por ahora.</p>`
      : payload.upcomingPrizeDraws
          .map(
            (draw) =>
              `<div style="padding:10px 0;border-top:1px solid #e5e0d8;">
                <strong style="display:block;">${draw.title}</strong>
                <span style="color:#5c554a;">${draw.displayValue} | ${draw.drawAt.toLocaleString('es-CO')}</span>
              </div>`
          )
          .join('');

  return `
  <div style="font-family: 'Trebuchet MS', 'Segoe UI', sans-serif; background:#f6f3ee; padding:40px 20px; color:#111;">
    <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #ddd;border-radius:18px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.08);">
      <div style="padding:28px;background:linear-gradient(135deg,#f5c26b,#ec7a5c);color:#111;">
        <p style="margin:0;font-size:12px;letter-spacing:0.2em;font-weight:700;text-transform:uppercase;">Rifaria</p>
        <h1 style="margin:10px 0 0;font-size:28px;line-height:1.1;">Tus boletas ya estan confirmadas</h1>
      </div>
      <div style="padding:28px;">
        <p style="margin:0 0 14px;">Hola <strong>${payload.fullName}</strong>, gracias por participar en <strong>${payload.raffleTitle}</strong>.</p>
        <p style="margin:0 0 18px;">Premio: <strong>${payload.rafflePrize}</strong></p>
        <div style="padding:16px;border:1px solid #e5e0d8;border-radius:14px;background:#faf8f5;margin-bottom:18px;">
          <p style="margin:0 0 8px;font-weight:700;">Tus numeros:</p>
          <div>${ticketsHtml}</div>
        </div>
        <p style="margin:0 0 6px;">Fecha de juego: <strong>${payload.drawAt.toLocaleString('es-CO')}</strong></p>
        <p style="margin:0;">Referencia de sorteo: <strong>${payload.drawSource}</strong></p>
        <div style="padding:16px;border:1px solid #e5e0d8;border-radius:14px;background:#faf8f5;margin-top:18px;">
          <p style="margin:0 0 8px;font-weight:700;">Premios en los que sigues participando:</p>
          ${upcomingHtml}
        </div>
      </div>
    </div>
  </div>
  `;
}

export function postponeEmailTemplate(payload: PostponeEmailTemplatePayload): string {
  return `
  <div style="font-family: 'Trebuchet MS', 'Segoe UI', sans-serif; background:#f2f6fb; padding:40px 20px; color:#121212;">
    <div style="max-width:620px;margin:0 auto;background:#fff;border:1px solid #d9e1ee;border-radius:14px;padding:26px;">
      <p style="margin:0 0 10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;font-size:12px;color:#2364aa;">Actualizacion Rifaria</p>
      <h2 style="margin:0 0 12px;font-size:26px;line-height:1.2;">Reprogramacion de fecha de juego</h2>
      <p style="margin:0 0 10px;">Hola <strong>${payload.fullName}</strong>, tu participacion en <strong>${payload.raffleTitle}</strong> sigue activa.</p>
      <p style="margin:0 0 10px;">Nueva fecha de juego: <strong>${payload.newDrawAt.toLocaleString('es-CO')}</strong></p>
      <p style="margin:0;">Motivo: ${payload.reason}</p>
    </div>
  </div>
  `;
}
