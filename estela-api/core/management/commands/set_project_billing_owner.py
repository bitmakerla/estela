from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError

from core.metering.billing import resolve_billing_account
from core.models import Project


class Command(BaseCommand):
    help = (
        "Give a Project created before owners were set at creation its owner Org, and that Org's "
        "billing account (acct_...) from the Account Registry. A Project's owner never moves "
        "(ADR 0005): a Project that already has one is refused."
    )

    def add_arguments(self, parser):
        parser.add_argument("project_id", help="The Project's pid.")
        parser.add_argument(
            "owner_org_id", help="The owner Org's id at the identity provider (Zitadel)."
        )

    def handle(self, *args, **options):
        try:
            project = Project.objects.get(pid=options["project_id"])
        except (Project.DoesNotExist, ValidationError):
            raise CommandError(f"Project {options['project_id']} not found")

        org_id = options["owner_org_id"]
        if project.owner_org_id:
            if project.owner_org_id == org_id:
                self.stdout.write(f"Project {project.pid} ({project.name}): already owned by Org {org_id}")
                return
            raise CommandError(
                f"Project {project.pid} is owned by Org {project.owner_org_id}; a Project's owner never moves"
            )

        try:
            account_id = resolve_billing_account(org_id)
        except Exception as exc:
            raise CommandError(f"Could not resolve the Org: {exc}")
        # Set by hand before owners existed: it must be this Org's, or usage already went elsewhere.
        if project.billing_account_id and project.billing_account_id != account_id:
            raise CommandError(
                f"Project {project.pid} bills to {project.billing_account_id}, "
                f"but Org {org_id} is {account_id}; nothing changed"
            )

        project.owner_org_id = org_id
        project.billing_account_id = account_id
        project.save(update_fields=["owner_org_id", "billing_account_id"])
        self.stdout.write(
            f"Project {project.pid} ({project.name}): owned by Org {org_id}, billing account {account_id}"
        )
