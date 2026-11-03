"""One lightweight worker thread per existing service; no extra containers."""
from threading import Event, Thread
import logging


def start(callback, seconds=60):
    stopped = Event()
    def work():
        while not stopped.wait(seconds):
            try: callback()
            except Exception:
                logging.getLogger(__name__).warning('Background delivery deferred; retrying next interval')
    Thread(target=work, name='outbox-delivery', daemon=True).start()
    return stopped
