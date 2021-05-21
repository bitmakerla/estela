"""
ASGI config for bitmaker project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.***REMOVED***project.com/en/3.1/howto/deployment/asgi/
"""

import os

from ***REMOVED***.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.base")

application = get_asgi_application()
