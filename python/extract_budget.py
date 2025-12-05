from docx import Document
import csv
import pandas as pd


def extract_table(index, outfile):
    doc = Document("data/input/A_80_400.DOCX")
    with open(outfile, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        for row in doc.tables[index].rows:
            writer.writerow([cell.text.strip() for cell in row.cells])

def clean_table6():
    # the table contains 3 row types
    # - part totals (stretched over 2 rows)
    # - section totals (=breakdowns of parts)
    # - entity totals (=breakdowns of sections, but not available for every section)
    # additionally, for section 3 there is a weird "– Other" category which seems to be the total of the subsequent rows and is thus redundant, so we drop that row
    t6 = pd.read_csv("data/intermediate/table6_raw.csv", header=[0, 1], skiprows=[2])
    t6.columns = [a if a == b or pd.isna(b) or b == '' else f'{a} – {b}' for a, b in t6.columns]
    col = 'Budget part/section/entity'
    is_part_header = t6[col].str.startswith('Part ')
    is_part_total = is_part_header.shift(1, fill_value=False)
    is_section_total = t6[col].str.match(r'^\d+[A-Z]?\.\t')
    is_entity_total = ~is_part_header & ~is_part_total & ~is_section_total
    t6['row_type'] = 'entity_total'
    t6.loc[is_part_total, 'row_type'] = 'part_total'
    t6.loc[is_section_total, 'row_type'] = 'section_total'
    t6['Part'] = t6[col].where(is_part_header).ffill()
    t6['Part name'] = t6[col].where(is_part_total).ffill()
    t6[['Section', 'Section name']] = t6[col].str.extract(r'^(\d+[A-Z]?)\.\t(.+)')
    t6[['Section', 'Section name']] = t6.groupby('Part')[['Section', 'Section name']].ffill()
    t6['Entity name'] = t6[col].where(is_entity_total).str.replace(r'^–\t', '', regex=True)
    # special case: "Resident coordinator systema" has footnote 'a' attached
    t6['_entity_fn'] = t6['Entity name'].where(t6['Entity name'] == 'Resident coordinator systema').str.extract(r'([a-z])$', expand=False)
    t6['Entity name'] = t6['Entity name'].replace('Resident coordinator systema', 'Resident coordinator system')
    order = ['row_type', 'Part', 'Part name', 'Section', 'Section name', 'Entity name']
    numeric_cols = [c for c in t6.columns if c not in order + [col, '_entity_fn']]
    # extract footnote markers before cleaning (from numeric cols + entity name)
    t6['footnotes'] = t6[numeric_cols].apply(lambda row: ''.join(sorted(set(''.join(row.dropna().astype(str).str.extract(r'([a-z]+)$', expand=False).dropna())))), axis=1)
    t6['footnotes'] = (t6['_entity_fn'].fillna('') + t6['footnotes']).apply(lambda x: ''.join(sorted(set(x))) or pd.NA)
    # clean numeric columns for ALL rows first
    for c in numeric_cols:
        t6[c] = t6[c].replace('–', '0').str.replace(r'[\s,]', '', regex=True).str.replace(r'\((.+)\)[a-z]*', r'-\1', regex=True).str.replace(r'[a-z]+$', '', regex=True)
        t6[c] = pd.to_numeric(t6[c], errors='coerce')
    # extract grand total after cleaning, before filtering
    grand_total = t6[t6[col] == 'Total'][numeric_cols].iloc[0]
    t6 = t6[~is_part_header & ~t6[col].isin(['–\tOther', 'Total']) & t6['2025 approved'].notna()]
    t6 = t6[order + numeric_cols + ['footnotes']]
    t6.to_csv("data/intermediate/table6_clean.csv", index=False)
    return grand_total

def verify_hierarchy(df, grand_total=None):
    num_cols = [c for c in df.select_dtypes('number').columns if c != 'Section']
    # exclude percentage columns from grand total check (can't sum percentages)
    summable_cols = [c for c in num_cols if 'percentage' not in c.lower()]
    errors = []
    # check grand total = sum of part totals
    if grand_total is not None:
        part_sum = df[df['row_type'] == 'part_total'][summable_cols].sum()
        diff = (grand_total[summable_cols] - part_sum).abs()
        if (diff > 0.1).any():
            errors.append(f"Grand total != sum(part_totals), diff={diff[diff > 0.1].to_dict()}")
    # check part totals = sum of section totals
    for part in df['Part'].unique():
        part_df = df[df['Part'] == part]
        part_total = part_df[part_df['row_type'] == 'part_total'][num_cols].iloc[0]
        section_sum = part_df[part_df['row_type'] == 'section_total'][num_cols].sum()
        if len(part_df[part_df['row_type'] == 'section_total']) > 0:
            diff = (part_total - section_sum).abs()
            if (diff > 0.1).any():
                errors.append(f"{part}: part_total != sum(section_totals), diff={diff[diff > 0.1].to_dict()}")
    # check section totals = sum of entity totals
    for (part, section), sec_df in df.groupby(['Part', 'Section']):
        if pd.isna(section):
            continue
        entities = sec_df[sec_df['row_type'] == 'entity_total']
        section_totals = sec_df[sec_df['row_type'] == 'section_total']
        if len(entities) == 0 or len(section_totals) == 0:
            continue
        section_total = section_totals[num_cols].iloc[0]
        entity_sum = entities[num_cols].sum()
        diff = (section_total - entity_sum).abs()
        if (diff > 0.1).any():
            errors.append(f"{part} Section {section}: section_total != sum(entity_totals), diff={diff[diff > 0.1].to_dict()}")
    return errors

extract_table(9, "data/intermediate/table6_raw.csv")
grand_total = clean_table6()
df = pd.read_csv("data/intermediate/table6_clean.csv")
errors = verify_hierarchy(df, grand_total)
assert len(errors) == 2  # known data errors in source: Transitional capacities not aggregated

# manual fix: roll up Transitional capacities through hierarchy
tc = 'Transitional capacities'
# fix section totals from entity sums (only if entities have TC values)
for (part, section), grp in df.groupby(['Part', 'Section']):
    if pd.isna(section):
        continue
    entity_sum = grp[grp['row_type'] == 'entity_total'][tc].sum()
    if entity_sum > 0:
        df.loc[(df['Part'] == part) & (df['Section'] == section) & (df['row_type'] == 'section_total'), tc] = entity_sum
# fix part totals from section sums
for part in df['Part'].unique():
    section_sum = df[(df['Part'] == part) & (df['row_type'] == 'section_total')][tc].sum()
    df.loc[(df['Part'] == part) & (df['row_type'] == 'part_total'), tc] = section_sum

errors = verify_hierarchy(df, grand_total)
assert not errors
df.to_csv("data/intermediate/table6_clean.csv", index=False)
