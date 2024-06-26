import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { map } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService extends ApiService {
    router : Router = inject(Router);

    hasAuthToken() {
        return this.http.get(this.apiUrl + '/auth/token', this.requestOptions);
    }

    hasError() {
        const params : URLSearchParams = new URLSearchParams(window.location.search);

        if(params.get('error')) {
            return true;
        }

        return false;
    }

    getOAuthURL() {
        return this.http.get(this.apiUrl + '/auth/login');
    }

    authorizeWithParams() {
        const params : URLSearchParams = new URLSearchParams(window.location.search);

        const code : any = params.get('code');
        const state : any = params.get('state');

        if(code && state) {
            const authParams : URLSearchParams = new URLSearchParams({
                code: code,
                state: state
            });

            return this.http.post(this.apiUrl + '/auth/info?' + authParams.toString(), {}, this.requestOptions);
        }

        return undefined;
    }

    refreshToken() {
        return this.http.post(this.apiUrl + '/auth/refresh', {}, this.requestOptions);
    }

    logout() {
        return this.http.delete(this.apiUrl + '/auth/logout', this.requestOptions).pipe(
            map(() => {
                this.router.navigate(['/login']);
            })
        );
    }
}
