"""
Management command to prune old avatar conversations.
Keeps the DB light by deleting conversations older than N days.
Summaries in `auto_summary` / `guest_notes` are preserved for context.

Usage:
    python manage.py prune_avatar_conversations          # 90 days default
    python manage.py prune_avatar_conversations --days 30  # custom
    python manage.py prune_avatar_conversations --dry-run  # see what would be deleted
"""

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from datetime import timedelta
from members.avatar_models import GuestConversation


class Command(BaseCommand):
    help = "Prune old avatar conversations. Summaries in auto_summary/guest_notes survive."

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=90,
            help='Delete conversations older than this many days (default: 90)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )

    def handle(self, *args, **options):
        days = options['days']
        dry_run = options['dry_run']

        cutoff = timezone.now() - timedelta(days=days)
        cutoff_str = cutoff.strftime('%Y-%m-%d %H:%M:%S')

        # Old ended conversations
        old_ended = GuestConversation.objects.filter(ended_at__lt=cutoff)
        # Stale (never ended, abandoned)
        stale = GuestConversation.objects.filter(
            ended_at__isnull=True, created_at__lt=cutoff
        )

        total_ended = old_ended.count()
        total_stale = stale.count()

        self.stdout.write(f"── Avatar Conversation Prune ──")
        self.stdout.write(f"  Cutoff date: {cutoff_str} ({days} days ago)")
        self.stdout.write(f"  Ended conversations to prune:  {total_ended}")
        self.stdout.write(f"  Stale/abandoned to prune:      {total_stale}")
        self.stdout.write(f"  Total:                          {total_ended + total_stale}")

        if dry_run:
            self.stdout.write(self.style.WARNING("  DRY RUN — no records deleted"))
            return

        if total_ended > 0:
            old_ended.delete()
            self.stdout.write(self.style.SUCCESS(f"  ✓ Pruned {total_ended} ended conversations"))

        if total_stale > 0:
            stale.delete()
            self.stdout.write(self.style.SUCCESS(f"  ✓ Pruned {total_stale} stale conversations"))

        if total_ended + total_stale == 0:
            self.stdout.write("  Nothing to prune.")
