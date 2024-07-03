import { Component, inject } from '@angular/core';
import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { AuthService } from './auth.service';

export const routes: Routes = [

    {
        path: "",
        component: HomeComponent,
        canActivate: [()=> inject(AuthService).isAuthenticator()]
    },
    {
        path:"login",
        component: LoginComponent
    },
    {
        path: "register",
        component: RegisterComponent
    }
];
