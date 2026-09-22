#!/usr/bin/env python3
"""Pulls a probe page's <pre id="out"> text out of a --dump-dom capture.

Reads the DOM on stdin, writes the decoded probe output on stdout. Split
out of run-probes.sh rather than inlined as a heredoc, because a heredoc
redirects stdin and would swallow the very thing being piped in.
"""
import html
import re
import sys

dom = sys.stdin.read()
match = re.search(r'<pre id="out"[^>]*>(.*?)</pre>', dom, re.S)
print(html.unescape(match.group(1)) if match else 'NO-OUTPUT')
