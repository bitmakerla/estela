from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError

from core.metering.billing import BILLING_ACCOUNT_ID_RE, resolve_billing_account
from core.models import Project


class Command(BaseCommand):
    help = (
        "Set the Org that pays for a Project: resolve its Zitadel Org id to a billing "
        "account (acct_...) through the Account Registry and store it on the Project."
    )

    def add_arguments(self, parser):
        parser.add_argument("project_id", help="The Project's pid.")
        parser.add_argument(
            "zitadel_org_id",
            nargs="?",
            help="The paying Org's Zitadel id, resolved through the Registry.",
        )
        parser.add_argument(
            "--account-id",
            help="Store this acct_ as is, without calling the Registry.",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Remove the Project's billing account: its usage stops being emitted.",
        )

    def handle(self, *args, **options):
        try:
            project = Project.objects.get(pid=options["project_id"])
        except (Project.DoesNotExist, ValidationError):
            raise CommandError(f"Project {options['project_id']} not found")

        chosen = [
            bool(options["zitadel_org_id"]),
            bool(options["account_id"]),
            options["clear"],
        ]
        if sum(chosen) != 1:
            raise CommandError(
                "Give exactly one of zitadel_org_id, --account-id or --clear"
            )

        if options["clear"]:
            account_id = None
        elif options["account_id"]:
            account_id = options["account_id"]
            if not BILLING_ACCOUNT_ID_RE.match(account_id):
                raise CommandError(f"Not a billing account id: {account_id}")
        else:
            try:
                account_id = resolve_billing_account(options["zitadel_org_id"])
            except Exception as exc:
                raise CommandError(f"Could not resolve the Org: {exc}")

        project.billing_account_id = account_id
        project.save(update_fields=["billing_account_id"])
        self.stdout.write(
            f"Project {project.pid} ({project.name}): billing account {account_id}"
        )
