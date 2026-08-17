import { Module } from '@nestjs/common';
import { TextChatController } from './text-chat.controller';
import { TextChatParserService } from './text-chat-parser.service';

@Module({
  controllers: [TextChatController],
  providers: [TextChatParserService],
  exports: [TextChatParserService],
})
export class TextChatModule {}
