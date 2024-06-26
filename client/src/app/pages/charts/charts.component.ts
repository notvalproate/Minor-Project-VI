import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';
import { UserChartsService } from './services/user-charts.service';

@Component({
  selector: 'app-charts',
  standalone: true,
  imports: [],
  templateUrl: './charts.component.html',
  styleUrl: './charts.component.scss'
})
export class ChartsComponent implements OnInit {
    private router: Router = inject(Router);
    private auth: AuthService = inject(AuthService);
    private charts: UserChartsService = inject(UserChartsService);

    topTracks: any = [];

    ngOnInit(): void {
        this.getChartsInfo();
    }

    private getChartsInfo() {
        this.charts.getCharts().subscribe({
            next: (resp: any) => {
                this.topTracks = resp.body.items;
            },
            error: (err: any) => {
                console.log(err);
            }
        })
    }

    goHome() {
        this.router.navigate(['home']);
    }
}
