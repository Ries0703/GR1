export class MessageResponseDto {
  private readonly content: string;
  private readonly role: 'assistant';

  constructor(content: string) {
    this.content = content;
    this.role = 'assistant';
  }

  getContent(): string {
    return this.content;
  }

  getRole(): 'assistant' {
    return this.role;
  }
}
