import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/auth.service';

type AuthMode = 'signIn' | 'signUp';

@Component({
  selector: 'lf-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly mode = signal<AuthMode>('signIn');
  readonly error = signal<string | null>(null);
  readonly submitting = signal(false);

  setMode(mode: AuthMode): void {
    this.mode.set(mode);
    this.error.set(null);
  }

  async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.submitting()) return;
    const form = event.target as HTMLFormElement;
    const data = new FormData(form);
    const displayName = String(data.get('displayName') ?? '').trim();
    const email = String(data.get('email') ?? '').trim();
    const password = String(data.get('password') ?? '');
    this.error.set(null);
    this.submitting.set(true);
    try {
      const request = this.mode() === 'signUp'
        ? this.auth.register(displayName, email, password)
        : this.auth.login(email, password);
      await firstValueFrom(request);
      await this.router.navigateByUrl('/football/squads');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Server connection failed');
    } finally {
      this.submitting.set(false);
    }
  }
}
