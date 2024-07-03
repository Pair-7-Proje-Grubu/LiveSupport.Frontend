import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RegisterModel } from '../../models/register.model';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, NgIf],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  registerModel: RegisterModel = new RegisterModel();
  errorMessage: string = '';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  register() {
    this.errorMessage = ''; // Her kayıt denemesinde hata mesajını sıfırla
    const formData = new FormData();
    formData.append("name", this.registerModel.name);
    formData.append("email", this.registerModel.email); // Email eklendi
    if (this.registerModel.file) {
      formData.append("file", this.registerModel.file);
    }

    this.http.post("https://localhost:7298/api/Auth/Register", formData).subscribe({
      next: (res) => {
        localStorage.setItem("accessToken", JSON.stringify(res));
        this.router.navigateByUrl("/login");
      },
      error: (error: HttpErrorResponse) => {
        console.error("Kayıt başarısız", error);
        if (error.status === 400) {
          this.errorMessage = "Geçersiz kayıt bilgileri. Lütfen bilgilerinizi kontrol edip tekrar deneyin.";
        } else {
          this.errorMessage = "Kayıt işlemi sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.";
        }
      }
    });
  }
}