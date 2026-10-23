/** Password reset controller. */

import { Controller, Post, Body, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { PasswordResetService } from "./password-reset.service.js";

@ApiTags("auth")
@Controller("auth/password")
export class PasswordResetController {
  constructor(private readonly passwordResetService: PasswordResetService) {}

  @Post("forgot")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Request a password reset OTP" })
  @ApiResponse({ status: 200, description: "OTP sent if email exists" })
  async forgot(@Body() body: { email: string }): Promise<{ success: boolean }> {
    return this.passwordResetService.initiatePasswordReset(body.email);
  }

  @Post("verify-otp")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify the password reset OTP" })
  @ApiResponse({ status: 200, description: "OTP verification result" })
  async verifyOtp(@Body() body: { email: string; otp: string }): Promise<{ valid: boolean; resetToken?: string }> {
    return this.passwordResetService.verifyOtp(body.email, body.otp);
  }

  @Post("reset")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reset password with a reset token" })
  @ApiResponse({ status: 200, description: "Password reset result" })
  async reset(@Body() body: { resetToken: string; newPassword: string }): Promise<{ success: boolean }> {
    return this.passwordResetService.resetPassword(body.resetToken, body.newPassword);
  }
}