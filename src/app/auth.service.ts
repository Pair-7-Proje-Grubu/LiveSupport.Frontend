import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private router: Router) { }

  isAuthenticator()
  {
    if(localStorage.getItem("accessToken"))
      {
        console.log("token var");
        
        return true;
      }

      this.router.navigateByUrl("/login");
      
      console.log("token yok");
      
      return false;
  }

}
