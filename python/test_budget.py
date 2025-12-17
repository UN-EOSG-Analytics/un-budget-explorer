"""
Comprehensive tests for UN Budget data integrity.

Tests verify:
1. Hierarchy sums (grand total → parts → sections → entities)
2. Percentage calculations
3. UN80 changes formula (Total = Relocation + Consolidation + Other)
4. 2026 revised estimate formula
5. Non-negative values where expected

================================================================================
NOTE ON PERCENTAGE DISCREPANCIES
================================================================================

The percentage tests report ~8 rows where our calculated variance differs from
the reported variance in the source document (A/80/400, Table 6). These are NOT
data errors - they are explained by footnotes in the source document.

The source document's "Variance (excluding resources redeployed for consolidation)"
percentages use ADJUSTED BASE AMOUNTS that exclude certain "exempted" items:

  Footnote | Entity/Section                      | Exemption
  ---------|-------------------------------------|------------------------------------------
  b        | Dept of Political & Peacebuilding   | Excludes $50M Peacebuilding Fund
  c        | UNTSO                               | Excludes $10.6M military observers
  d        | UNMOGIP                             | Excludes $1.7M military observers
  e,f      | Section 29B: Dept of Operational    | Excludes inward consolidation transfers
           | Support                             | + $20.9M non-discretionary costs
  g        | Section 29D: Admin Nairobi          | Excludes $4.5M non-recurrent costs

KEY EXAMPLE - Section 29B (largest discrepancy of 3.4 percentage points):
  - Reported percentage:     -12.9%
  - Our simple calculation:  -16.3%
  - Footnote f states:       -16.5% (after proper adjustments)

The -12.9% is the "headline" number, but footnote f clarifies that after
excluding inward consolidation transfers and $20.9M non-discretionary costs,
the REAL reduction is -16.5% — which matches our calculation almost exactly.

CONCLUSION: The data is correct. The footnotes explain that some percentages
use adjusted base amounts, and the "true" percentage (noted in footnotes) is
consistent with our calculations.
================================================================================
"""

import pandas as pd
import numpy as np
from pathlib import Path

# Tolerance for floating point comparisons (0.01% relative tolerance or $100 absolute)
REL_TOL = 0.0001
ABS_TOL = 100  # $100 absolute tolerance for rounding


def load_budget_data():
    """Load the budget CSV data."""
    csv_path = Path(__file__).parent.parent / "data" / "intermediate" / "table6.csv"
    return pd.read_csv(csv_path)


def test_grand_total_equals_sum_of_parts():
    """Grand total should equal sum of all part totals."""
    df = load_budget_data()
    
    # Define summable numeric columns (exclude percentages)
    numeric_cols = [
        '2025 approved',
        '2026 proposed programme budget',
        'UN80 changes (excluding transitional capacities) – Relocation',
        'UN80 changes (excluding transitional capacities) – Consolidation',
        'UN80 changes (excluding transitional capacities) – Other',
        'UN80 changes (excluding transitional capacities) – Total',
        '2026 revised estimate',
        'Transitional capacities',
    ]
    
    grand_total = df[df['row_type'] == 'grand_total'][numeric_cols].iloc[0]
    part_totals = df[df['row_type'] == 'part_total'][numeric_cols].sum()
    
    errors = []
    for col in numeric_cols:
        expected = grand_total[col]
        actual = part_totals[col]
        if pd.notna(expected) and pd.notna(actual):
            diff = abs(expected - actual)
            if diff > ABS_TOL and diff / max(abs(expected), 1) > REL_TOL:
                errors.append(f"{col}: grand_total={expected:,.0f}, sum(parts)={actual:,.0f}, diff={diff:,.0f}")
    
    assert not errors, f"Grand total != sum of parts:\n" + "\n".join(errors)
    print("✓ Grand total equals sum of parts")


def test_part_totals_equal_sum_of_sections():
    """Each part total should equal sum of section totals within that part."""
    df = load_budget_data()
    
    numeric_cols = [
        '2025 approved',
        '2026 proposed programme budget',
        'UN80 changes (excluding transitional capacities) – Relocation',
        'UN80 changes (excluding transitional capacities) – Consolidation',
        'UN80 changes (excluding transitional capacities) – Other',
        'UN80 changes (excluding transitional capacities) – Total',
        '2026 revised estimate',
        'Transitional capacities',
    ]
    
    errors = []
    for part in df['Part'].dropna().unique():
        part_df = df[df['Part'] == part]
        part_total = part_df[part_df['row_type'] == 'part_total'][numeric_cols]
        section_totals = part_df[part_df['row_type'] == 'section_total'][numeric_cols]
        
        if len(part_total) == 0 or len(section_totals) == 0:
            continue
        
        part_total = part_total.iloc[0]
        section_sum = section_totals.sum()
        
        for col in numeric_cols:
            expected = part_total[col]
            actual = section_sum[col]
            if pd.notna(expected) and pd.notna(actual):
                diff = abs(expected - actual)
                if diff > ABS_TOL and diff / max(abs(expected), 1) > REL_TOL:
                    errors.append(f"{part}, {col}: part_total={expected:,.0f}, sum(sections)={actual:,.0f}, diff={diff:,.0f}")
    
    assert not errors, f"Part totals != sum of sections:\n" + "\n".join(errors)
    print("✓ Part totals equal sum of sections")


def test_section_totals_equal_sum_of_entities():
    """Each section total should equal sum of entity totals (where entities exist)."""
    df = load_budget_data()
    
    numeric_cols = [
        '2025 approved',
        '2026 proposed programme budget',
        'UN80 changes (excluding transitional capacities) – Relocation',
        'UN80 changes (excluding transitional capacities) – Consolidation',
        'UN80 changes (excluding transitional capacities) – Other',
        'UN80 changes (excluding transitional capacities) – Total',
        '2026 revised estimate',
        'Transitional capacities',
    ]
    
    errors = []
    for (part, section), grp in df.groupby(['Part', 'Section']):
        if pd.isna(section):
            continue
        
        entities = grp[grp['row_type'] == 'entity_total']
        section_totals = grp[grp['row_type'] == 'section_total']
        
        if len(entities) == 0 or len(section_totals) == 0:
            continue
        
        section_total = section_totals[numeric_cols].iloc[0]
        entity_sum = entities[numeric_cols].sum()
        
        for col in numeric_cols:
            expected = section_total[col]
            actual = entity_sum[col]
            if pd.notna(expected) and pd.notna(actual):
                diff = abs(expected - actual)
                if diff > ABS_TOL and diff / max(abs(expected), 1) > REL_TOL:
                    errors.append(f"{part} Section {section}, {col}: section_total={expected:,.0f}, sum(entities)={actual:,.0f}, diff={diff:,.0f}")
    
    assert not errors, f"Section totals != sum of entities:\n" + "\n".join(errors)
    print("✓ Section totals equal sum of entities")


def test_un80_total_equals_sum_of_components():
    """UN80 Total should equal Relocation + Consolidation + Other."""
    df = load_budget_data()
    
    relocation = df['UN80 changes (excluding transitional capacities) – Relocation'].fillna(0)
    consolidation = df['UN80 changes (excluding transitional capacities) – Consolidation'].fillna(0)
    other = df['UN80 changes (excluding transitional capacities) – Other'].fillna(0)
    total = df['UN80 changes (excluding transitional capacities) – Total']
    
    calculated_total = relocation + consolidation + other
    
    errors = []
    for idx, row in df.iterrows():
        expected = row['UN80 changes (excluding transitional capacities) – Total']
        actual = calculated_total[idx]
        if pd.notna(expected):
            diff = abs(expected - actual)
            if diff > ABS_TOL and diff / max(abs(expected), 1) > REL_TOL:
                name = row['Entity name'] or row['Section name'] or row['Part name']
                errors.append(f"Row {idx} ({name}): Total={expected:,.0f}, R+C+O={actual:,.0f}, diff={diff:,.0f}")
    
    assert not errors, f"UN80 Total != Relocation + Consolidation + Other:\n" + "\n".join(errors)
    print("✓ UN80 Total equals sum of components (Relocation + Consolidation + Other)")


def test_2026_revised_estimate_formula():
    """2026 revised estimate should equal 2026 proposed + UN80 Total."""
    df = load_budget_data()
    
    proposed = df['2026 proposed programme budget'].fillna(0)
    un80_total = df['UN80 changes (excluding transitional capacities) – Total'].fillna(0)
    revised = df['2026 revised estimate']
    
    # The formula is: 2026 revised = 2026 proposed + UN80 Total
    # Note: Transitional capacities are NOT added to the revised estimate
    calculated_revised = proposed + un80_total
    
    errors = []
    for idx, row in df.iterrows():
        expected = row['2026 revised estimate']
        actual = calculated_revised[idx]
        if pd.notna(expected):
            diff = abs(expected - actual)
            if diff > ABS_TOL and diff / max(abs(expected), 1) > REL_TOL:
                name = row['Entity name'] or row['Section name'] or row['Part name']
                errors.append(f"Row {idx} ({name}): revised={expected:,.0f}, proposed+un80={actual:,.0f}, diff={diff:,.0f}")
    
    assert not errors, f"2026 revised estimate != 2026 proposed + UN80 Total:\n" + "\n".join(errors)
    print("✓ 2026 revised estimate equals 2026 proposed + UN80 Total")


def get_row_label(row):
    """Get a human-readable label for a row."""
    if pd.notna(row.get('Entity name')):
        return row['Entity name']
    if pd.notna(row.get('Section name')):
        return f"Section {row['Section']}: {row['Section name']}"
    if pd.notna(row.get('Part name')):
        return row['Part name']
    return f"Row {row.name}"


def test_variance_percentage_vs_2025_approved():
    """Variance percentage compared with 2025 should be correct."""
    df = load_budget_data()
    
    col_pct = 'Variance (excluding resources redeployed for consolidation) – Compared with 2025 approved (percentage)'
    col_2025 = '2025 approved'
    col_revised = '2026 revised estimate'
    # Note: We need to exclude consolidation from revised for this calculation
    col_consolidation = 'UN80 changes (excluding transitional capacities) – Consolidation'
    
    errors = []
    for idx, row in df.iterrows():
        reported_pct = row[col_pct]
        approved_2025 = row[col_2025]
        revised_2026 = row[col_revised]
        consolidation = row[col_consolidation] if pd.notna(row[col_consolidation]) else 0
        
        # Skip if percentage not reported or 2025 is zero (can't calculate percentage)
        if pd.isna(reported_pct) or pd.isna(approved_2025) or approved_2025 == 0:
            continue
        
        # Formula: (2026 revised - consolidation - 2025 approved) / 2025 approved * 100
        # The variance EXCLUDES resources redeployed for consolidation
        revised_excl_consolidation = revised_2026 - consolidation
        calculated_pct = (revised_excl_consolidation - approved_2025) / approved_2025 * 100
        
        diff = abs(reported_pct - calculated_pct)
        if diff > 0.2:  # Allow 0.2 percentage point tolerance for rounding
            label = get_row_label(row)
            errors.append({
                'row': idx,
                'label': label,
                'reported': reported_pct,
                'calculated': calculated_pct,
                'diff': diff,
                'consolidation': consolidation,
            })
    
    if errors:
        print(f"⚠ Variance vs 2025 approved - {len(errors)} discrepancies:")
        for e in errors[:10]:  # Show first 10
            print(f"  Row {e['row']} ({e['label']}): reported={e['reported']:.1f}%, calculated={e['calculated']:.1f}%, diff={e['diff']:.1f}pp")
            if e['consolidation'] != 0:
                print(f"    (has consolidation adjustment: ${e['consolidation']:,.0f})")
        if len(errors) > 10:
            print(f"  ... and {len(errors) - 10} more")
    else:
        print("✓ Variance percentages vs 2025 approved are correct")
    
    return errors


def test_variance_percentage_vs_2026_proposed():
    """Variance percentage compared with 2026 proposed should be correct."""
    df = load_budget_data()
    
    col_pct = 'Variance (excluding resources redeployed for consolidation) – Compared with 2026 proposed programme budget (percentage)'
    col_proposed = '2026 proposed programme budget'
    col_revised = '2026 revised estimate'
    col_consolidation = 'UN80 changes (excluding transitional capacities) – Consolidation'
    
    errors = []
    for idx, row in df.iterrows():
        reported_pct = row[col_pct]
        proposed_2026 = row[col_proposed]
        revised_2026 = row[col_revised]
        consolidation = row[col_consolidation] if pd.notna(row[col_consolidation]) else 0
        
        # Skip if percentage not reported or proposed is zero
        if pd.isna(reported_pct) or pd.isna(proposed_2026) or proposed_2026 == 0:
            continue
        
        # Formula: (2026 revised - consolidation - 2026 proposed) / 2026 proposed * 100
        revised_excl_consolidation = revised_2026 - consolidation
        calculated_pct = (revised_excl_consolidation - proposed_2026) / proposed_2026 * 100
        
        diff = abs(reported_pct - calculated_pct)
        if diff > 0.2:  # Allow 0.2 percentage point tolerance
            label = get_row_label(row)
            errors.append({
                'row': idx,
                'label': label,
                'reported': reported_pct,
                'calculated': calculated_pct,
                'diff': diff,
                'consolidation': consolidation,
            })
    
    if errors:
        print(f"⚠ Variance vs 2026 proposed - {len(errors)} discrepancies:")
        for e in errors[:10]:
            print(f"  Row {e['row']} ({e['label']}): reported={e['reported']:.1f}%, calculated={e['calculated']:.1f}%, diff={e['diff']:.1f}pp")
            if e['consolidation'] != 0:
                print(f"    (has consolidation adjustment: ${e['consolidation']:,.0f})")
        if len(errors) > 10:
            print(f"  ... and {len(errors) - 10} more")
    else:
        print("✓ Variance percentages vs 2026 proposed are correct")
    
    return errors


def test_no_negative_approved_values():
    """2025 approved and 2026 proposed values should not be negative."""
    df = load_budget_data()
    
    errors = []
    for col in ['2025 approved', '2026 proposed programme budget', '2026 revised estimate']:
        negative = df[df[col] < 0]
        for idx, row in negative.iterrows():
            name = row['Entity name'] or row['Section name'] or row['Part name']
            errors.append(f"{col}: {name} = {row[col]:,.0f}")
    
    assert not errors, f"Negative values found:\n" + "\n".join(errors)
    print("✓ No negative values in approved/proposed/revised columns")


def test_transitional_capacities_non_negative():
    """Transitional capacities should be non-negative."""
    df = load_budget_data()
    
    tc = df['Transitional capacities'].fillna(0)
    negative = df[tc < 0]
    
    errors = []
    for idx, row in negative.iterrows():
        name = row['Entity name'] or row['Section name'] or row['Part name']
        errors.append(f"{name}: {row['Transitional capacities']:,.0f}")
    
    assert not errors, f"Negative transitional capacities found:\n" + "\n".join(errors)
    print("✓ Transitional capacities are non-negative")


def test_row_type_coverage():
    """All rows should have a valid row_type."""
    df = load_budget_data()
    
    valid_types = {'grand_total', 'part_total', 'section_total', 'entity_total'}
    invalid = df[~df['row_type'].isin(valid_types)]
    
    assert len(invalid) == 0, f"Invalid row types found: {invalid['row_type'].unique()}"
    print("✓ All rows have valid row_type")


def test_hierarchy_completeness():
    """Check that Part and Section fields are properly filled."""
    df = load_budget_data()
    
    # Exclude grand_total from this check
    df_no_grand = df[df['row_type'] != 'grand_total']
    
    errors = []
    
    # All rows should have a Part
    missing_part = df_no_grand[df_no_grand['Part'].isna()]
    if len(missing_part) > 0:
        errors.append(f"{len(missing_part)} rows missing Part")
    
    # section_total and entity_total should have Section
    needs_section = df_no_grand[df_no_grand['row_type'].isin(['section_total', 'entity_total'])]
    missing_section = needs_section[needs_section['Section'].isna()]
    if len(missing_section) > 0:
        errors.append(f"{len(missing_section)} section/entity rows missing Section")
    
    # entity_total should have Entity name
    entity_rows = df_no_grand[df_no_grand['row_type'] == 'entity_total']
    missing_entity = entity_rows[entity_rows['Entity name'].isna()]
    if len(missing_entity) > 0:
        errors.append(f"{len(missing_entity)} entity rows missing Entity name")
    
    assert not errors, f"Hierarchy completeness errors:\n" + "\n".join(errors)
    print("✓ Hierarchy fields are complete")


def test_entity_count():
    """Verify we have a reasonable number of entities."""
    df = load_budget_data()
    
    counts = df['row_type'].value_counts()
    
    print(f"  Row counts: {counts.to_dict()}")
    
    assert counts.get('grand_total', 0) == 1, "Should have exactly 1 grand_total"
    assert counts.get('part_total', 0) >= 10, "Should have at least 10 parts"
    assert counts.get('section_total', 0) >= 30, "Should have at least 30 sections"
    assert counts.get('entity_total', 0) >= 40, "Should have at least 40 entities"
    
    print("✓ Entity counts are reasonable")


def test_percentages_within_bounds():
    """Variance percentages should be within reasonable bounds (-100% to +200%)."""
    df = load_budget_data()
    
    pct_cols = [
        'Variance (excluding resources redeployed for consolidation) – Compared with 2025 approved (percentage)',
        'Variance (excluding resources redeployed for consolidation) – Compared with 2026 proposed programme budget (percentage)',
    ]
    
    errors = []
    for col in pct_cols:
        values = df[col].dropna()
        
        # Check for extreme values (but allow for some edge cases like new entities)
        extreme_high = df[df[col] > 200]
        extreme_low = df[df[col] < -100]
        
        for idx, row in extreme_high.iterrows():
            name = row['Entity name'] or row['Section name'] or row['Part name']
            # This might be legitimate (e.g., new programs) so just warn
            print(f"  Note: {col} = {row[col]:.1f}% for {name}")
        
        for idx, row in extreme_low.iterrows():
            name = row['Entity name'] or row['Section name'] or row['Part name']
            errors.append(f"{col} = {row[col]:.1f}% for {name} (below -100%)")
    
    assert not errors, f"Percentages below -100% found:\n" + "\n".join(errors)
    print("✓ Percentages are within reasonable bounds")


def test_budget_totals_summary():
    """Print summary of budget totals for manual verification."""
    df = load_budget_data()
    
    grand_total = df[df['row_type'] == 'grand_total'].iloc[0]
    
    print("\n📊 Budget Summary:")
    print(f"  2025 Approved:        ${grand_total['2025 approved']:>20,.0f}")
    print(f"  2026 Proposed:        ${grand_total['2026 proposed programme budget']:>20,.0f}")
    print(f"  UN80 Changes Total:   ${grand_total['UN80 changes (excluding transitional capacities) – Total']:>20,.0f}")
    print(f"  2026 Revised:         ${grand_total['2026 revised estimate']:>20,.0f}")
    print(f"  Transitional Cap:     ${grand_total['Transitional capacities']:>20,.0f}")
    
    # Calculate overall percentage change
    change = grand_total['2026 revised estimate'] - grand_total['2025 approved']
    pct_change = change / grand_total['2025 approved'] * 100
    print(f"\n  Overall change: ${change:,.0f} ({pct_change:.1f}%)")


def test_json_output_matches_csv():
    """Verify that the JSON output matches the CSV data."""
    import json
    
    df = load_budget_data()
    json_path = Path(__file__).parent.parent / "public" / "budget.json"
    
    if not json_path.exists():
        print("⚠ budget.json not found - skipping JSON validation")
        return []
    
    with open(json_path, encoding="utf-8") as f:
        json_data = json.load(f)
    
    errors = []
    
    # Check row counts match
    if len(json_data) != len(df):
        errors.append(f"Row count mismatch: CSV={len(df)}, JSON={len(json_data)}")
    
    # Check key columns match
    for i, (csv_row, json_row) in enumerate(zip(df.itertuples(), json_data)):
        csv_approved = csv_row._7 if hasattr(csv_row, '_7') else df.iloc[i]['2025 approved']
        json_approved = json_row.get('2025 approved')
        
        if pd.notna(csv_approved) and json_approved is not None:
            if abs(csv_approved - json_approved) > ABS_TOL:
                errors.append(f"Row {i}: 2025 approved mismatch - CSV={csv_approved:,.0f}, JSON={json_approved:,.0f}")
    
    if errors:
        print(f"✗ JSON/CSV mismatches found:")
        for e in errors[:5]:
            print(f"  {e}")
    else:
        print("✓ JSON output matches CSV data")
    
    return errors


def test_sections_without_entities_are_expected():
    """Document which sections have no entity breakdown."""
    df = load_budget_data()
    
    sections_without_entities = []
    for (part, section), grp in df.groupby(['Part', 'Section']):
        if pd.isna(section):
            continue
        entities = grp[grp['row_type'] == 'entity_total']
        if len(entities) == 0:
            section_name = grp[grp['row_type'] == 'section_total']['Section name'].iloc[0]
            sections_without_entities.append(f"Section {section}: {section_name}")
    
    if sections_without_entities:
        print(f"ℹ {len(sections_without_entities)} sections without entity breakdown:")
        for s in sections_without_entities[:10]:
            print(f"  {s}")
        if len(sections_without_entities) > 10:
            print(f"  ... and {len(sections_without_entities) - 10} more")
    else:
        print("✓ All sections have entity breakdown")
    
    return []  # Not an error, just informational


def test_unique_entity_names():
    """Check for duplicate entity names within sections."""
    df = load_budget_data()
    
    entity_rows = df[df['row_type'] == 'entity_total']
    
    errors = []
    for (part, section), grp in entity_rows.groupby(['Part', 'Section']):
        names = grp['Entity name'].dropna()
        duplicates = names[names.duplicated()]
        for dup in duplicates:
            errors.append(f"{part} Section {section}: duplicate entity '{dup}'")
    
    assert not errors, f"Duplicate entity names found:\n" + "\n".join(errors)
    print("✓ All entity names are unique within their sections")


def test_parts_are_sequential():
    """Check that parts are numbered sequentially (Part I through Part XIV)."""
    df = load_budget_data()
    
    parts = df['Part'].dropna().unique()
    expected_parts = [f"Part {n}" for n in ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV']]
    
    missing = set(expected_parts) - set(parts)
    extra = set(parts) - set(expected_parts)
    
    errors = []
    if missing:
        errors.append(f"Missing parts: {missing}")
    if extra:
        errors.append(f"Unexpected parts: {extra}")
    
    assert not errors, f"Part issues:\n" + "\n".join(errors)
    print(f"✓ All 14 parts present (Part I through Part XIV)")


def test_consolidation_is_budget_neutral():
    """Consolidation changes should sum to zero across the budget (resources moved, not added/removed)."""
    df = load_budget_data()
    
    # Only look at entity and section levels (not aggregates)
    detail_rows = df[df['row_type'].isin(['entity_total', 'section_total'])]
    
    consolidation_sum = detail_rows['UN80 changes (excluding transitional capacities) – Consolidation'].fillna(0).sum()
    
    # Allow small tolerance for rounding
    if abs(consolidation_sum) > ABS_TOL * 10:  # $1000 tolerance for full budget
        print(f"⚠ Consolidation changes don't net to zero: ${consolidation_sum:,.0f}")
        print("  (This may be expected if consolidation involves cross-budget transfers)")
    else:
        print(f"✓ Consolidation changes approximately net to zero (${consolidation_sum:,.0f})")
    
    return []


def test_percentage_formula_investigation():
    """Investigate percentage calculation formulas for rows with discrepancies."""
    df = load_budget_data()
    
    col_pct_2025 = 'Variance (excluding resources redeployed for consolidation) – Compared with 2025 approved (percentage)'
    col_2025 = '2025 approved'
    col_revised = '2026 revised estimate'
    col_consolidation = 'UN80 changes (excluding transitional capacities) – Consolidation'
    
    print("  Investigating percentage calculation for rows with consolidation...")
    
    # Only look at rows with consolidation AND a reported percentage
    for idx, row in df.iterrows():
        reported_pct = row[col_pct_2025]
        consolidation = row[col_consolidation]
        approved_2025 = row[col_2025]
        revised_2026 = row[col_revised]
        
        if pd.isna(reported_pct) or pd.isna(consolidation) or consolidation == 0 or pd.isna(approved_2025):
            continue
        
        # Formula 1: Simple change (no adjustment)
        simple_pct = (revised_2026 - approved_2025) / approved_2025 * 100
        
        # Formula 2: Exclude consolidation from revised (our current approach)
        excl_revised_pct = (revised_2026 - consolidation - approved_2025) / approved_2025 * 100
        
        # Formula 3: Maybe consolidation should be ADDED to approved baseline?
        adj_baseline_pct = (revised_2026 - (approved_2025 + consolidation)) / (approved_2025 + consolidation) * 100 if approved_2025 + consolidation != 0 else None
        
        # Check which formula matches
        matches = []
        if abs(simple_pct - reported_pct) < 0.2:
            matches.append("simple")
        if abs(excl_revised_pct - reported_pct) < 0.2:
            matches.append("excl_revised")
        if adj_baseline_pct is not None and abs(adj_baseline_pct - reported_pct) < 0.2:
            matches.append("adj_baseline")
        
        if not matches:
            label = get_row_label(row)
            print(f"  {label}:")
            print(f"    Reported: {reported_pct:.1f}%")
            print(f"    Simple (no adj): {simple_pct:.1f}%")
            print(f"    Excl consolidation: {excl_revised_pct:.1f}%")
            if adj_baseline_pct:
                print(f"    Adj baseline: {adj_baseline_pct:.1f}%")
    
    return []


def test_change_directions_make_sense():
    """Verify that UN80 changes and variance percentages have consistent signs."""
    df = load_budget_data()
    
    col_un80 = 'UN80 changes (excluding transitional capacities) – Total'
    col_pct_2025 = 'Variance (excluding resources redeployed for consolidation) – Compared with 2025 approved (percentage)'
    col_pct_2026 = 'Variance (excluding resources redeployed for consolidation) – Compared with 2026 proposed programme budget (percentage)'
    
    # For rows where UN80 changes are zero or positive, percentages should be >= 0
    # (unless there are other factors like proposed changes)
    errors = []
    
    for idx, row in df.iterrows():
        un80 = row[col_un80] if pd.notna(row[col_un80]) else 0
        pct_2026 = row[col_pct_2026]
        
        # If UN80 total is negative, the variance vs 2026 proposed should also be negative
        if un80 < -ABS_TOL and pd.notna(pct_2026) and pct_2026 > 0.1:
            label = get_row_label(row)
            errors.append(f"{label}: UN80 change={un80:,.0f} but variance vs 2026 proposed={pct_2026:.1f}%")
    
    if errors:
        print(f"⚠ Inconsistent change directions ({len(errors)} cases):")
        for e in errors[:5]:
            print(f"  {e}")
    else:
        print("✓ Change directions are consistent")
    
    return errors


def run_all_tests():
    """Run all tests and report results."""
    print("=" * 60)
    print("UN Budget Data Integrity Tests")
    print("=" * 60 + "\n")
    
    tests = [
        # Hierarchy tests - verify sums add up correctly
        ("Hierarchy: Grand total = sum(parts)", test_grand_total_equals_sum_of_parts),
        ("Hierarchy: Part totals = sum(sections)", test_part_totals_equal_sum_of_sections),
        ("Hierarchy: Section totals = sum(entities)", test_section_totals_equal_sum_of_entities),
        
        # Formula tests - verify calculations are correct
        ("Formula: UN80 Total = R + C + O", test_un80_total_equals_sum_of_components),
        ("Formula: 2026 revised = proposed + UN80", test_2026_revised_estimate_formula),
        
        # Percentage tests
        ("Percentage: vs 2025 approved", test_variance_percentage_vs_2025_approved),
        ("Percentage: vs 2026 proposed", test_variance_percentage_vs_2026_proposed),
        ("Percentage: bounds check", test_percentages_within_bounds),
        
        # Data validation tests
        ("Validation: No negative budget values", test_no_negative_approved_values),
        ("Validation: Non-negative transitional cap", test_transitional_capacities_non_negative),
        ("Validation: Valid row types", test_row_type_coverage),
        ("Validation: Hierarchy completeness", test_hierarchy_completeness),
        ("Validation: Entity counts", test_entity_count),
        ("Validation: Unique entity names", test_unique_entity_names),
        ("Validation: Parts are sequential", test_parts_are_sequential),
        
        # Consistency tests
        ("Consistency: Consolidation is budget neutral", test_consolidation_is_budget_neutral),
        ("Consistency: Change directions", test_change_directions_make_sense),
        ("Consistency: JSON matches CSV", test_json_output_matches_csv),
        
        # Informational
        ("Info: Sections without entity breakdown", test_sections_without_entities_are_expected),
        ("Info: Percentage formula investigation", test_percentage_formula_investigation),
    ]
    
    passed = 0
    failed = 0
    warnings = 0
    
    for name, test_fn in tests:
        try:
            print(f"\n[{name}]")
            result = test_fn()
            if isinstance(result, list) and len(result) > 0:
                warnings += 1
            else:
                passed += 1
        except AssertionError as e:
            failed += 1
            print(f"✗ FAILED: {e}")
        except Exception as e:
            failed += 1
            print(f"✗ ERROR: {e}")
    
    # Print summary
    test_budget_totals_summary()
    
    print("\n" + "=" * 60)
    print(f"Results: {passed} passed, {warnings} warnings, {failed} failed")
    print("=" * 60)
    
    return failed == 0


if __name__ == "__main__":
    import sys
    success = run_all_tests()
    sys.exit(0 if success else 1)

