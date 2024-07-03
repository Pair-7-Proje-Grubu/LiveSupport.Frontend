import { CommonModule } from '@angular/common';
import { Component, ViewChild, ElementRef, AfterViewChecked, inject, OnInit } from '@angular/core';
import { UserModel } from '../../models/user.model';
import { ChatModel } from '../../models/chat.model';
import { HttpClient } from '@angular/common/http';
import * as signalR from '@microsoft/signalr';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements AfterViewChecked, OnInit {
  @ViewChild('chatHistory') private chatHistory!: ElementRef;

  users: UserModel[] = [];
  chats: ChatModel[] = [];
  selectedUserId: string = "";
  selectedUser: UserModel = new UserModel();
  user = new UserModel();
  hub: signalR.HubConnection | undefined;
  message: string = "";
  private shouldScrollToBottom = false;
  waitingForModerator: boolean = false;
  private welcomeMessageSent: boolean = false;

  private http = inject(HttpClient);

  constructor() {
    this.user = JSON.parse(localStorage.getItem("accessToken") ?? "");
    this.getUsers();
                                              
    this.hub = new signalR.HubConnectionBuilder().withUrl("https://localhost:7298/chat-hub").build();

    this.hub.start().then(() => {
      console.log("Connection started...");

      this.hub?.invoke("Connect", this.user.id);

      this.hub?.on("Users", (res: UserModel) => {
        console.log(res);
        if (this.user.role === 1 && res.id === this.user.id) {
          return;
        }
        
        const userIndex = this.users.findIndex(p => p.id === res.id);
        if (userIndex !== -1) {
          this.users[userIndex].status = res.status;
          this.updateUserActivityTime(res.id);
        } else if (this.user.role === 1 || res.role === 1) {
          res.lastActivityTime = new Date();
          this.users.push(res);
        }
        
        this.sortUsersByStatus();
        
        if (this.user.role === 0 && !this.selectedUserId) {
          this.autoSelectModerator();
        }
      });

      this.hub?.on("Messages", (res: ChatModel) => {
        console.log(res);
        if (this.selectedUserId == res.userId || this.selectedUserId == res.toUserId) {
          const existingMessageIndex = this.chats.findIndex(chat => 
            chat.userId === res.userId && 
            chat.toUserId === res.toUserId && 
            chat.message === res.message &&
            chat.date === res.date
          );
          if (existingMessageIndex === -1) {
            this.chats.push(res);
            this.shouldScrollToBottom = true;
          }
        }
        this.updateUserActivityTime(res.userId);
      });
    });
  }

  ngOnInit() {
    if (this.user.role === 0) {
      this.autoSelectModerator();
    }
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  getUsers() {
    this.http.get<UserModel[]>(`https://localhost:7298/api/Chats/GetUsers?currentUserId=${this.user.id}`).subscribe(res => {
      if (this.user.role === 1) {
        this.users = res.filter(user => user.id !== this.user.id);
      } else {
        this.users = res.filter(user => user.role === 1);
        this.autoSelectModerator();
      }
      this.users.forEach(user => user.lastActivityTime = new Date());
      this.sortUsersByStatus();
    });
  }

  sortUsersByStatus() {
    this.users.sort((a, b) => {
      if (a.status === 'online' && b.status !== 'online') return -1;
      if (a.status !== 'online' && b.status === 'online') return 1;
      return 0;
    });
  }

  updateUserActivityTime(userId: string) {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      this.users[userIndex].lastActivityTime = new Date();
    }
  }

  getTimeSinceLastActivity(user: UserModel): string {
    if (user.status !== 'online') return '';

    const now = new Date();
    const lastActivity = new Date(user.lastActivityTime);
    const diffMs = now.getTime() - lastActivity.getTime();
    const diffMins = Math.round(diffMs / 60000);
    
    if (diffMins < 1) return 'Şimdi';
    if (diffMins < 60) return `${diffMins} dakika önce`;
    
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours} saat önce`;
  }

  autoSelectModerator() {
    const availableModerators = this.users.filter(user => user.role === 1 && user.status === 'online');
    if (availableModerators.length > 0) {
      this.changeUser(availableModerators[0]);
      this.waitingForModerator = false;
    } else {
      this.waitingForModerator = true;
      this.selectedUser = new UserModel();
      this.selectedUser.name = "Müşteri Temsilcisi";
      this.selectedUser.status = "bekleniyor";
    }
  }

  changeUser(user: UserModel) {
    this.selectedUserId = user.id;
    this.selectedUser = user;
    this.waitingForModerator = false;

    this.http.get(`https://localhost:7298/api/Chats/GetChats?userId=${this.user.id}&toUserId=${this.selectedUserId}`).
    subscribe((res: any) => {
      this.chats = res;
      this.shouldScrollToBottom = true;
      if (this.user.role === 0) {
        this.sendWelcomeMessage();
      }
    });
  }

  logout() {
    localStorage.clear();
    document.location.reload();
  }

  sendMessage() {
    if (this.waitingForModerator) {
      return;
    }
    const data = {
      "userId": this.user.id,
      "toUserId": this.selectedUser.id,
      "message": this.message
    }
    this.http.post<ChatModel>("https://localhost:7298/api/Chats/SendMessage", data).subscribe((res) => {
      if (!this.chats.some(chat => 
        chat.userId === res.userId && 
        chat.toUserId === res.toUserId && 
        chat.message === res.message &&
        chat.date === res.date
      )) {
        this.chats.push(res);
        this.shouldScrollToBottom = true;
      }
      this.message = "";
      this.updateUserActivityTime(this.user.id);
    });
  }

  sendWelcomeMessage() {
    if (!this.welcomeMessageSent && this.user.role === 0) {
      const welcomeMessage = "Merhaba! Size nasıl yardımcı olabilirim?";
      const data = {
        "userId": this.selectedUser.id,
        "toUserId": this.user.id,
        "message": welcomeMessage
      };
      this.http.post<ChatModel>("https://localhost:7298/api/Chats/SendMessage", data).subscribe((res) => {
        if (!this.chats.some(chat => 
          chat.userId === res.userId && 
          chat.toUserId === res.toUserId && 
          chat.message === res.message &&
          chat.date === res.date
        )) {
          this.chats.push(res);
          this.shouldScrollToBottom = true;
        }
        this.welcomeMessageSent = true;
      });
    }
  }

  private scrollToBottom(): void {
    try {
      this.chatHistory.nativeElement.scrollTop = this.chatHistory.nativeElement.scrollHeight;
    } catch(err) { }
  }
}