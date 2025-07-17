import { Module } from "@nestjs/common";

import { AuthModule } from "modules/auth/auth.module";
import { UserModule } from "modules/user/user.module";

import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";

@Module({
  imports: [AuthModule, UserModule],
  providers: [ChatService],
  controllers: [ChatController],
  exports: [ChatService],
})
export class ChatModule {}
