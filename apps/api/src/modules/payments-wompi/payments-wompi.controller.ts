import { Body, Controller, Headers, Post } from '@nestjs/common';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { WompiWebhookDto } from './dto/wompi-webhook.dto';
import { PaymentsWompiService } from './payments-wompi.service';

@Controller('public/payments/wompi')
export class PaymentsWompiController {
  constructor(private readonly paymentsWompiService: PaymentsWompiService) {}

  @Post('checkout')
  createCheckout(@Body() dto: CreateCheckoutDto) {
    return this.paymentsWompiService.createCheckout(dto);
  }

  @Post('webhook')
  processWebhook(@Body() payload: WompiWebhookDto, @Headers('x-wompi-checksum') checksum?: string) {
    return this.paymentsWompiService.handleWebhook(payload, checksum);
  }
}
