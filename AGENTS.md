<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Application rules
- Global hero images use canonical Storage references in the existing site_configuration metadata envelope, resolved through the services layer; this preserves portability and avoids temporary URLs.
- Admin AI launch actions link to the existing authenticated AI module and follow its registered minimum role; this preserves existing server-side tool authorization.
- Public images use the shared SafeImage component, which recovers when its source changes; this avoids broken-image icons without altering stored content.
