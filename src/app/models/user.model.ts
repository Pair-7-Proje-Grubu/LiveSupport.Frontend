export class UserModel {
  id: string = '';
  name: string = '';
  email: string = '';
  status: string = '';
  role: number = 0;
  lastActivityTime: Date = new Date();

  constructor() {
    this.lastActivityTime = new Date();
  }
}