export abstract class EmailService {
  abstract send(to: string, subject: string, body: string): Promise<void>;
}
