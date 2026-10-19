#!/usr/bin/env python3
"""Build TK-16, a compact CC0 General MIDI SoundFont.

The bank is authored from deterministic mathematical waveforms; no recorded
samples or third-party tables are read.  Keep this source beside the
provenance manifest so every sample remains reproducible and auditable.
"""
from __future__ import annotations

import hashlib
import json
import math
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "media" / "soundfonts" / "TK-16.sf2"
PROVENANCE = ROOT / "tools" / "licences" / "tk16-provenance.json"
SAMPLE_RATE = 22050
FRAME_COUNT = 1024
LOOP_START = 64
LOOP_END = 960

INSTRUMENTS = [
    ("TK Piano", "sine", 261.63),
    ("TK Bright", "triangle", 329.63),
    ("TK EP", "bell", 392.00),
    ("TK Organ", "organ", 261.63),
    ("TK Guitar", "pluck", 196.00),
    ("TK Bass", "bass", 110.00),
    ("TK Strings", "strings", 293.66),
    ("TK Choir", "choir", 220.00),
    ("TK Brass", "brass", 233.08),
    ("TK Synth", "square", 329.63),
    ("TK Bell", "bell", 523.25),
    ("TK Lead", "saw", 440.00),
    ("TK Pad", "pad", 174.61),
    ("TK Pluck", "pluck", 277.18),
    ("TK Flute", "flute", 349.23),
    ("TK SFX", "noise", 440.00),
    ("TK Drums", "drums", 110.00),
]


def chunk(tag: bytes, payload: bytes) -> bytes:
    result = tag + struct.pack("<I", len(payload)) + payload
    return result + (b"\0" if len(payload) & 1 else b"")


def list_chunk(kind: bytes, children: list[bytes]) -> bytes:
    return chunk(b"LIST", kind + b"".join(children))


def text_chunk(tag: bytes, value: str) -> bytes:
    return chunk(tag, value.encode("ascii") + b"\0")


def waveform(kind: str, frequency: float, index: int) -> list[int]:
    out: list[int] = []
    phase_step = 2.0 * math.pi * frequency / SAMPLE_RATE
    for frame in range(FRAME_COUNT):
        phase = phase_step * frame
        cycle = (phase / (2.0 * math.pi)) % 1.0
        if kind == "sine":
            value = math.sin(phase)
        elif kind == "triangle":
            value = 4.0 * abs(cycle - 0.5) - 1.0
        elif kind == "square":
            value = 1.0 if cycle < 0.5 else -1.0
        elif kind == "saw":
            value = 2.0 * cycle - 1.0
        elif kind == "organ":
            value = 0.72 * math.sin(phase) + 0.24 * math.sin(phase * 2.0) + 0.12 * math.sin(phase * 3.0)
        elif kind == "bell":
            value = 0.72 * math.sin(phase) + 0.28 * math.sin(phase * 2.71)
        elif kind == "pluck":
            value = 0.75 * math.sin(phase) + 0.25 * math.sin(phase * 2.0)
        elif kind == "bass":
            value = 0.82 * math.sin(phase) + 0.18 * math.sin(phase * 0.5)
        elif kind == "strings":
            value = 0.58 * math.sin(phase) + 0.28 * math.sin(phase * 1.01) + 0.14 * math.sin(phase * 2.0)
        elif kind == "choir":
            value = 0.55 * math.sin(phase) + 0.30 * math.sin(phase * 1.5) + 0.15 * math.sin(phase * 2.0)
        elif kind == "brass":
            value = 0.62 * math.sin(phase) + 0.38 * (2.0 * cycle - 1.0)
        elif kind == "pad":
            value = 0.70 * math.sin(phase) + 0.20 * math.sin(phase * 0.5) + 0.10 * math.sin(phase * 2.0)
        elif kind == "flute":
            value = 0.88 * math.sin(phase) + 0.12 * math.sin(phase * 2.0)
        elif kind == "noise":
            value = math.sin((frame + 1) * (index + 17) * 12.9898) * 0.8
        else:  # drums: tonal kick-like waveform with a deterministic click
            value = 0.74 * math.sin(phase * (1.0 + 0.3 * math.sin(frame / 64.0)))
            if frame < 20:
                value += 0.22 * (1.0 if frame & 1 else -1.0)
        # A short, deterministic contour avoids a click at the loop boundary.
        contour = min(1.0, frame / 32.0, (FRAME_COUNT - frame) / 32.0)
        out.append(max(-32768, min(32767, int(round(value * contour * 15000.0)))))
    return out


def phdr(name: str, preset: int, bank: int, bag_index: int) -> bytes:
    return struct.pack("<20sHHHIII", name.encode("ascii")[:19].ljust(20, b"\0"), preset, bank, bag_index, 0, 0, 0)


def shdr(name: str, start: int, end: int, start_loop: int, end_loop: int) -> bytes:
    return struct.pack(
        "<20sIIIIIBbHH",
        name.encode("ascii")[:19].ljust(20, b"\0"),
        start,
        end,
        start_loop,
        end_loop,
        SAMPLE_RATE,
        60,
        0,
        0,
        1,
    )


def build() -> tuple[bytes, dict]:
    samples: list[int] = []
    sample_records = []
    sample_headers = []
    for index, (name, kind, frequency) in enumerate(INSTRUMENTS):
        start = len(samples)
        frames = waveform(kind, frequency, index)
        samples.extend(frames)
        end = len(samples)
        sample_headers.append(shdr(name, start, end, start + LOOP_START, start + LOOP_END))
        sample_records.append(
            {
                "id": index,
                "name": name,
                "generator": kind,
                "frequencyHz": frequency,
                "sampleRateHz": SAMPLE_RATE,
                "frames": FRAME_COUNT,
                "loopFrames": [LOOP_START, LOOP_END],
                "source": "Original deterministic mathematical waveform generated by tools/licences/tk16_build.py; no recorded or third-party sample data.",
                "license": "CC0-1.0",
            }
        )
    samples.extend([0] * 46)

    # Keep the drum preset after the 16 melodic programs, with its own bank.
    phdr_records = [phdr(INSTRUMENTS[index][0], index, 0, index) for index in range(16)] + [phdr("TK Drums", 0, 128, 16), phdr("EOP", 0, 0, 17)]
    pbag_records = [struct.pack("<HH", index, 0) for index in range(18)]
    pgen_records = [struct.pack("<Hh", 41, index) for index in range(17)]
    pgen_records.append(struct.pack("<Hh", 0, 0))

    inst_records = [struct.pack("<20sH", INSTRUMENTS[index][0].encode("ascii")[:19].ljust(20, b"\0"), index) for index in range(17)]
    inst_records.append(struct.pack("<20sH", b"EOI\0".ljust(20, b"\0"), 17))
    ibag_records = [struct.pack("<HH", index * 3, 0) for index in range(17)] + [struct.pack("<HH", 51, 0)]
    igen_records: list[bytes] = []
    for index in range(17):
        key_range = 0 | (127 << 8)
        igen_records.append(struct.pack("<Hh", 43, key_range))
        igen_records.append(struct.pack("<Hh", 53, index))
        igen_records.append(struct.pack("<Hh", 54, 1))  # continuous loop mode
    igen_records.append(struct.pack("<Hh", 0, 0))

    info = list_chunk(
        b"INFO",
        [
            chunk(b"ifil", struct.pack("<HH", 2, 1)),
            text_chunk(b"isng", "EMU8000"),
            text_chunk(b"INAM", "TK-16 General MIDI Bank"),
            text_chunk(b"IENG", "TK Reawakened contributors"),
            text_chunk(b"ICMT", "Original CC0 mathematical waveforms; compact 16-voice RPG palette."),
        ],
    )
    sdta = list_chunk(b"sdta", [chunk(b"smpl", struct.pack("<" + "h" * len(samples), *samples))])
    pdta = list_chunk(
        b"pdta",
        [
            chunk(b"phdr", b"".join(phdr_records)),
            chunk(b"pbag", b"".join(pbag_records)),
            chunk(b"pmod", b"\0" * 10),
            chunk(b"pgen", b"".join(pgen_records)),
            chunk(b"inst", b"".join(inst_records)),
            chunk(b"ibag", b"".join(ibag_records)),
            chunk(b"imod", b"\0" * 10),
            chunk(b"igen", b"".join(igen_records)),
            chunk(b"shdr", b"".join(sample_headers) + shdr("EOS", len(samples), len(samples), len(samples), len(samples))),
        ],
    )
    body = info + sdta + pdta
    bank = b"RIFF" + struct.pack("<I", len(b"sfbk") + len(body)) + b"sfbk" + body
    provenance = {
        "bank": "TK-16",
        "format": "SoundFont 2.1 RIFF sfbk",
        "license": "CC0-1.0",
        "authoring": "Pure deterministic synthesis; no third-party or recorded samples.",
        "generator": "tools/licences/tk16_build.py",
        "sampleCount": len(sample_records),
        "samples": sample_records,
    }
    return bank, provenance


def main() -> None:
    bank, provenance = build()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_bytes(bank)
    digest = hashlib.sha256(bank).hexdigest()
    provenance["bytes"] = len(bank)
    provenance["sha256"] = digest
    PROVENANCE.write_text(json.dumps(provenance, indent=2) + "\n", encoding="utf-8")
    print(f"{OUTPUT}: {len(bank)} bytes, sha256 {digest}")


if __name__ == "__main__":
    main()
