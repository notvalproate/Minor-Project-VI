import { Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserInfoService } from '../services/user-info.service';
import { PollingService } from '../services/polling.service';

@Component({
  selector: 'home',
  standalone: true,
  imports: [],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, OnDestroy {
    private router: Router = inject(Router);
    private auth: AuthService = inject(AuthService);
    private userInfoService: UserInfoService = inject(UserInfoService);
    private playerPoller: PollingService = new PollingService();
    private progressPoller: PollingService = new PollingService();

    profileName: string = '';
    profileUrl: string = '';

    isPlayerActive: boolean = false;

    currentSongImgUrl: string = '';
    currentSongTitle: string = '';
    currentSongUrl: string = '';
    currentISRC: string = '';
    currentSongLength: number = 0;
    currentSongProgress: number = 0;
    currentProgressPercent: string = '0%';

    currentArtists: string[] = [];
    currentArtistsUrls: string[] = [];

    loadingLyrics: boolean = false;
    currentLyrics: string[] = [];
    lyricsProvider: string = '';
    lyricsUrl: string = '';

    trackPolling: any = undefined;

    ngOnInit(): void {
        this.getUserInfo();

        this.progressPoller.config({
            intervalTime: 1000,
        });
        this.playerPoller.startPolling(this.getCurrentTrack.bind(this));
    }

    ngOnDestroy() {
        this.playerPoller.stopPolling();
    }

    async getUserInfo() {
        this.userInfoService.getUserInfo().subscribe({
            next: (resp: any) => {
                const info = resp.body;

                this.profileName = info.user.displayName;
                this.profileUrl = info.user.url;
            },
            error: (resp: any) => {
                console.log(resp.error);
            }
        });
    }

    async getCurrentTrack() {
        this.userInfoService.getPlayerInfo().subscribe({
            next: (resp: any) => {
                if(resp.status === 204) {
                    this.isPlayerActive = false;
                    return;
                }

                const info = resp.body;

                let previousISRC = this.currentISRC;

                this.isPlayerActive = true;

                this.currentSongImgUrl = info.item.images.default;
                this.currentSongTitle = info.item.title;
                this.currentSongUrl = info.item.url;
                this.currentISRC = info.item.isrc;

                this.currentSongLength = info.player.duration;
                this.currentSongProgress = info.player.progress;
                this.currentProgressPercent = ((this.currentSongProgress * 100) / this.currentSongLength) + '%';

                this.currentArtists = info.item.artists.map((artist: any) => artist.name);
                this.currentArtistsUrls = info.item.artists.map((artist: any) => artist.url);

                if(previousISRC !== this.currentISRC) {
                    this.progressPoller.startPolling(this.increaseProgressByOneSecond.bind(this));

                    this.loadingLyrics = true;

                    this.userInfoService.getLyrics(this.currentArtists, this.currentSongTitle).subscribe({
                        next: (resp: any) => {
                            this.loadingLyrics = false;

                            if(resp.body === null) {
                                this.currentLyrics = [];
                                this.lyricsUrl = '';
                                return;
                            }

                            const lyrics = resp.body;

                            this.lyricsUrl = lyrics.url;
                            this.lyricsProvider = lyrics.provider;

                            if(lyrics.lyricsBody === null) {
                                this.currentLyrics = [];
                                return;
                            }

                            this.currentLyrics = lyrics.lyricsBody.split('\n');
                        },
                        error: (resp: any) => {
                            this.loadingLyrics = false;
                            this.currentLyrics = [];
                            this.lyricsUrl = '';
                            this.lyricsProvider = '';
                            console.log(resp.error);
                        }
                    });
                }
            },
            error: (resp: any) => {
                this.isPlayerActive = false;
                this.currentLyrics = [];
                this.currentISRC = '';
                this.progressPoller.stopPolling();
                console.log(resp.error);
            }
        });
    }

    increaseProgressByOneSecond() {
        this.currentSongProgress += 1000;

        if(this.currentSongProgress >= this.currentSongLength){
            this.currentSongProgress = this.currentSongLength;
        }

        this.currentProgressPercent = ((this.currentSongProgress * 100) / this.currentSongLength) + '%';
    }

    msToMinutesString(ms: number) {
        const minutes = Math.floor(ms / (1000 * 60));
        const seconds = Math.floor(ms % (1000 * 60) / 1000);

        return `${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`;
    }

    @HostListener('document:visibilitychange', ['$event'])
    handleVisibilityChange() {
        if (document.hidden) {
            this.playerPoller.stopPolling();
        } else {
            this.playerPoller.startPolling(this.getCurrentTrack.bind(this));
        }
    }

    async onLogout() {
        this.auth.logout().subscribe({
            next: (resp: any) => {
                this.router.navigate(['login']);
            },
            error: (resp: any) => {
                console.log(resp.error);
            }
        });
    }

    goToCharts() {
        this.router.navigate(['charts']);
    }
}
