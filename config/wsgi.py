"""
WSGI config for bitmaker project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.***REMOVED***project.com/en/3.1/howto/deployment/wsgi/
"""

import os

from ***REMOVED***.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.base")

application = get_wsgi_application()
