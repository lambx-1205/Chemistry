#!/usr/bin/env python3
"""Resolve eligible Organic Atlas structures to verified PubChem Compound records.

Japanese display names and educational annotations are preserved. The PubChem title,
CID, formula, molecular weight, IUPAC name, InChIKey, and canonical SMILES are stored
as source metadata. Non-discrete polymers and categories excluded by the app's
safety policy are intentionally not queried.
"""
from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

DATA_FILE = Path(__file__).resolve().parents[1] / "chemistry-data.js"
START_MARKER = "var compounds = ["
END_MARKER = "\n];\nvar edges = ["
PROPERTIES = "Title,IUPACName,SMILES,ConnectivitySMILES,InChIKey,MolecularFormula,MolecularWeight"
SUBSCRIPT = str.maketrans("₀₁₂₃₄₅₆₇₈₉", "0123456789")
USER_AGENT = "OrganicAtlas educational chemical-data enrichment/1.0"
REQUEST_DELAY_SECONDS = 0.32


class NoRecordFound(Exception):
    pass


def normalize_formula(value: object) -> str:
    return re.sub(r"\s+", "", str(value or "")).translate(SUBSCRIPT)


RESTRICTED_PATTERN = re.compile(
    r"(trinitrotoluene|tnt|nitroglycerin|nitroglycerine|"
    r"methamphetamine|amphetamine|cocaine|heroin|fentanyl|mdma|ecstasy|"
    r"oxycodone|hydrocodone|carfentanil|ricin|sarin|vx nerve agent|cyanide|"
    r"hydrazoic acid|rdx|pentaerythritol tetranitrate|petn|"
    r"cumene[- ]hydroperoxide|benzenediazonium|benzene diazonium|"
    r"トリニトロトルエン|ニトログリセリン|クメンヒドロペルオキシド|"
    r"塩化ベンゼンジアゾニウム|メタンフェタミン|覚醒剤|コカイン|"
    r"ヘロイン|フェンタニル|エクスタシー|モルヒネ|オキシコドン|"
    r"リシン毒素|ヒマ毒|サリン|シアン化物|青酸|爆薬|爆発物|神経剤)",
    re.IGNORECASE,
)


def is_eligible(compound: dict) -> bool:
    """Resolve every discrete structure except records excluded by the UI guard."""
    smiles = str(compound.get("smiles") or "").strip()
    formula = str(compound.get("formula") or "")
    if not smiles or "*" in smiles:
        return False
    if not formula or "ₙ" in formula:
        return False

    identity = " ".join(
        str(compound.get(key) or "")
        for key in ("id", "name", "pubchemName")
    )
    family = str(compound.get("family") or "")
    # Polymers/repeating materials do not have one discrete molecular structure.
    if re.search(r"高分子|polymer", family, re.IGNORECASE):
        return False
    if re.search(r"cellulose|starch|natural-rubber|polyethylene|polystyrene|"
                 r"polypropylene|polyvinyl|polyacrylonitrile|polybutadiene|"
                 r"nylon-66|^ptfe$", str(compound.get("id") or ""), re.IGNORECASE):
        return False
    # Resolve public identity metadata for the three existing discrete entries.
    # Their separate 3D-view restrictions in the UI remain in place.
    if RESTRICTED_PATTERN.search(identity) and compound.get("id") not in {"diazonium", "cumene-hydroperoxide", "tnt"}:
        return False
    return True


def request_json(url: str) -> dict:
    request = urllib.request.Request(
        url,
        headers={"Accept": "application/json", "User-Agent": USER_AGENT},
    )
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=25) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            if exc.code == 404:
                raise NoRecordFound("No exact PubChem record") from exc
            last_error = exc
            if exc.code not in (408, 429, 500, 502, 503, 504) or attempt == 2:
                break
            try:
                wait = float(exc.headers.get("Retry-After", "1.5"))
            except (TypeError, ValueError):
                wait = 1.5
            time.sleep(max(1.0, min(wait, 12.0)))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            last_error = exc
            if attempt == 2:
                break
            time.sleep(1.5 * (attempt + 1))
    if last_error:
        raise last_error
    raise RuntimeError("PubChem request failed")


def property_rows(url: str) -> list[dict]:
    payload = request_json(url)
    rows = payload.get("PropertyTable", {}).get("Properties", [])
    return [row for row in rows if isinstance(row, dict)]


def query_smiles(smiles: str) -> list[dict]:
    encoded = urllib.parse.quote(smiles, safe="")
    url = (
        "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/"
        f"{encoded}/property/{PROPERTIES}/JSON"
    )
    return property_rows(url)


def query_name(name: str) -> list[dict]:
    encoded = urllib.parse.quote(name, safe="")
    url = (
        "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/"
        f"{encoded}/property/{PROPERTIES}/JSON"
    )
    return property_rows(url)


def select_formula_match(rows: list[dict], expected_formula: str) -> dict | None:
    expected = normalize_formula(expected_formula)
    for row in rows:
        actual = normalize_formula(row.get("MolecularFormula"))
        if row.get("CID") and actual and actual == expected:
            return row
    return None


def enrich(compound: dict) -> bool:
    if compound.get("pubchemLookupStatus") == "verified" and compound.get("pubchemCid"):
        return False

    expected_formula = compound.get("formula")
    row = None
    errors: list[str] = []

    try:
        row = select_formula_match(query_smiles(compound["smiles"]), expected_formula)
    except (NoRecordFound, urllib.error.URLError, TimeoutError, RuntimeError, ValueError) as exc:
        errors.append(f"{type(exc).__name__}: {exc}")

    # Name fallback is only accepted when the returned molecular formula agrees
    # with the Japanese dataset's curated formula.
    time.sleep(REQUEST_DELAY_SECONDS)
    if row is None and compound.get("pubchemName"):
        try:
            row = select_formula_match(query_name(str(compound["pubchemName"])), expected_formula)
        except (NoRecordFound, urllib.error.URLError, TimeoutError, RuntimeError, ValueError) as exc:
            errors.append(exc)

    if row is None:
        compound["pubchemLookupStatus"] = "unresolved"
        compound["pubchemLookupReason"] = (
            "No PubChem record with a matching molecular formula was returned."
            + ((" Lookup errors: " + "; ".join(str(err) for err in errors)) if errors else "")
        )
        return False

    cid = int(row["CID"])
    title = str(row.get("Title") or compound.get("pubchemName") or "").strip()
    if not title:
        title = str(compound.get("id") or "").replace("-", " ")

    # Keep the user-facing Japanese name and descriptions untouched.
    compound["pubchemCid"] = cid
    compound["pubchemName"] = title
    compound["sourceTitle"] = title
    compound["englishName"] = title
    compound["pubchemFormula"] = row.get("MolecularFormula") or expected_formula
    try:
        compound["molecularWeight"] = float(row["MolecularWeight"])
    except (KeyError, TypeError, ValueError):
        compound.pop("molecularWeight", None)

    if row.get("InChIKey"):
        compound["inchiKey"] = row["InChIKey"]
    if row.get("IUPACName"):
        compound["iupacName"] = row["IUPACName"]
    pubchem_smiles = row.get("SMILES") or row.get("ConnectivitySMILES")
    if pubchem_smiles:
        compound["smiles"] = pubchem_smiles

    compound["structureSource"] = "PubChem"
    compound["pubchemLookupStatus"] = "verified"
    return True


def parse_compounds(source: str) -> tuple[list[dict], str, str]:
    start = source.index(START_MARKER) + len(START_MARKER)
    end = source.index(END_MARKER, start)
    body = source[start:end]
    records: list[dict] = []
    for line in body.splitlines():
        item = line.strip()
        if not item:
            continue
        if item.endswith(","):
            item = item[:-1]
        records.append(json.loads(item))
    return records, source[:start], source[end:]


def main() -> int:
    original = DATA_FILE.read_text(encoding="utf-8")
    compounds, prefix, suffix = parse_compounds(original)
    eligible = [item for item in compounds if is_eligible(item)]
    skipped = len(compounds) - len(eligible)
    updated = 0
    unresolved = 0

    for index, compound in enumerate(eligible, start=1):
        if compound.get("pubchemLookupStatus") == "verified" and compound.get("pubchemCid"):
            continue
        try:
            if enrich(compound):
                updated += 1
            else:
                unresolved += 1
                print(f"UNRESOLVED {compound.get('id')} | {compound.get('name')} | {compound.get('pubchemLookupReason', 'No formula-matched record')}")
        except Exception as exc:
            unresolved += 1
            compound["pubchemLookupStatus"] = "unresolved"
            compound["pubchemLookupReason"] = f"{type(exc).__name__}: {exc}"
            print(f"ERROR {compound.get('id')} | {compound.get('name')} | {exc}")
        if index < len(eligible):
            time.sleep(REQUEST_DELAY_SECONDS)

    new_body = "\n" + ",\n".join(
        json.dumps(item, ensure_ascii=False, separators=(",", ":"))
        for item in compounds
    )
    updated_source = prefix + new_body + suffix
    if updated_source != original:
        DATA_FILE.write_text(updated_source, encoding="utf-8")

    verified = sum(
        1 for item in eligible
        if item.get("pubchemLookupStatus") == "verified" and item.get("pubchemCid")
    )
    print(
        "PubChem enrichment complete: "
        f"verified={verified}, newly_resolved={updated}, "
        f"unresolved_or_formula_mismatch={unresolved}, excluded={skipped}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
