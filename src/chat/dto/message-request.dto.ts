export class MessageRequestDto {
  private readonly content: string;
  private readonly role: 'user';

  constructor(content: string) {
    this.content = content;
    this.role = 'user';
  }

  getContent(): string {
    return this.content;
  }

  getRole(): 'user' {
    return this.role;
  }
}
