import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
import pandas as pd

SRC = Path(sys.argv[1])
OUT = Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)

# ---- palette (reference instance, light mode) ----
SURFACE = "#ffffff"
INK = "#0b0b0b"
INK2 = "#52514e"
MUTED = "#8a8984"
GRID = "#e6e5e1"
C1, C2, C3 = "#2a78d6", "#eb6834", "#1baf7a"  # categorical slots 1-3
BLUE_POS, RED_NEG = "#2a78d6", "#e34948"       # diverging poles

plt.rcParams.update({
    "font.family": ["Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
    "font.size": 11,
    "text.parse_math": False,
    "text.color": INK,
    "axes.labelcolor": INK2,
    "axes.edgecolor": GRID,
    "xtick.color": INK2,
    "ytick.color": INK2,
    "axes.spines.top": False,
    "axes.spines.right": False,
    "figure.facecolor": SURFACE,
    "axes.facecolor": SURFACE,
    "savefig.facecolor": SURFACE,
})

# ---- load ----
e = pd.read_csv(SRC / "expenses.csv")
g = pd.read_csv(SRC / "groups.csv")
s = pd.read_csv(SRC / "settlements.csv")
sp = pd.read_csv(SRC / "expense_splits.csv")
u = pd.read_csv(SRC / "users.csv")
a = pd.read_csv(SRC / "activity_log.csv")
dd = pd.read_csv(SRC / "dim_date.csv")

e = e.merge(g[["group_id", "group_name", "group_type"]], on="group_id")
e["year_month"] = e.transaction_date.str[:7]
month_label = dd.drop_duplicates("year_month").set_index("year_month").month_name.str[:3]
months = sorted(e.year_month.unique())
mlabels = [month_label[m] for m in months]


def money(v, dp=0):
    return ("-" if v < 0 else "") + f"${abs(v):,.{dp}f}"


def title(fig, ax, heading, sub):
    ax.set_title(heading, loc="left", fontsize=15, fontweight="bold", color=INK, pad=28)
    ax.text(0, 1.02, sub, transform=ax.transAxes, fontsize=10.5, color=INK2, va="bottom")


def footer(fig):
    fig.text(0.01, -0.15 / fig.get_figheight(), "Source: SplitSync synthetic reporting dataset (Jan to Sep 2026)",
             fontsize=8, color=MUTED, ha="left", va="top")


def ygrid(ax):
    ax.yaxis.grid(True, color=GRID, linewidth=0.8)
    ax.set_axisbelow(True)
    ax.tick_params(length=0)


def xgrid(ax):
    ax.xaxis.grid(True, color=GRID, linewidth=0.8)
    ax.set_axisbelow(True)
    ax.tick_params(length=0)
    ax.spines["left"].set_visible(False)


def save(fig, name):
    fig.savefig(OUT / name, dpi=200, bbox_inches="tight", pad_inches=0.25)
    plt.close(fig)
    print("wrote", name)


BAR = dict(edgecolor=SURFACE, linewidth=1.5)  # 2px-ish surface gap between segments

# ---- 1. Monthly spend by group type (stacked) ----
pv = e.pivot_table(index="year_month", columns="group_type", values="total_amount",
                   aggfunc="sum").reindex(months).fillna(0)
order = [("household", C1, "Household"), ("travel", C2, "Travel"), ("social", C3, "Social")]
fig, ax = plt.subplots(figsize=(10, 5.2))
bottom = pd.Series(0.0, index=months)
for key, col, lab in order:
    ax.bar(mlabels, pv[key], bottom=bottom, color=col, width=0.62, label=lab, **BAR)
    bottom += pv[key]
for i, tot in enumerate(bottom):
    ax.text(i, tot + 250, money(tot), ha="center", fontsize=9, color=INK2)
ax.yaxis.set_major_formatter(lambda v, _: money(v))
ygrid(ax)
ax.set_ylim(0, bottom.max() * 1.12)
ax.legend(frameon=False, ncol=3, loc="upper left", bbox_to_anchor=(0, 1.0))
peak = months.index("2026-06")
ax.annotate("Bali trip", xy=(peak + 0.33, pv.loc["2026-06", "household"] + pv.loc["2026-06", "travel"] * 0.6),
            xytext=(peak + 1.1, bottom.max() * 0.85), fontsize=9.5, color=INK2,
            arrowprops=dict(arrowstyle="-", color=MUTED, lw=1))
title(fig, ax, "Monthly spend by group type",
      f"Total {money(e.total_amount.sum())} across {len(e)} expenses. June spikes from travel groups.")
footer(fig)
save(fig, "01_monthly_spend_by_group_type.png")

# ---- 2. Spend by category (top 10 + other) ----
cat = e.groupby("category").total_amount.sum().sort_values(ascending=False)
top = cat.head(10)
top["Other (10 categories)"] = cat.iloc[10:].sum()
top = top[::-1]
fig, ax = plt.subplots(figsize=(10, 5.6))
colors = [MUTED if "Other" in k else C1 for k in top.index]
ax.barh(top.index, top.values, color=colors, height=0.66, **BAR)
for i, v in enumerate(top.values):
    ax.text(v + top.max() * 0.01, i, f"{money(v)}  ({v / cat.sum():.0%})", va="center", fontsize=9.5, color=INK2)
ax.xaxis.set_major_formatter(lambda v, _: money(v))
xgrid(ax)
ax.set_xlim(0, top.max() * 1.22)
title(fig, ax, "Spend by category",
      f"Rent alone is {cat['Rent'] / cat.sum():.0%} of all spend. Top 10 categories shown.")
footer(fig)
save(fig, "02_spend_by_category.png")

# ---- 3. Spend per group (total + count + average) ----
grp = e.groupby("group_name").agg(total=("total_amount", "sum"), n=("expense_id", "count"),
                                   avg=("total_amount", "mean")).sort_values("total")
fig, ax = plt.subplots(figsize=(10, 4.6))
ax.barh(grp.index, grp.total, color=C1, height=0.62, **BAR)
for i, (t, n, av) in enumerate(zip(grp.total, grp.n, grp.avg)):
    ax.text(t + grp.total.max() * 0.01, i, f"{money(t)}   {n} expenses, avg {money(av)}",
            va="center", fontsize=9.5, color=INK2)
ax.xaxis.set_major_formatter(lambda v, _: money(v))
xgrid(ax)
ax.set_xlim(0, grp.total.max() * 1.45)
title(fig, ax, "Total spend per group",
      "Household groups spend the most. Office Lunch Club logs many small expenses.")
footer(fig)
save(fig, "03_spend_per_group.png")

# ---- 4. Split method usage ----
sm = e.split_method.value_counts().reindex(["equal", "unequal", "percentage"])
sm_amt = e.groupby("split_method").total_amount.sum().reindex(sm.index)
fig, ax = plt.subplots(figsize=(10, 3.4))
labels = ["Equal", "Unequal ($)", "Percentage"][::-1]
ax.barh(labels, sm.values[::-1], color=C1, height=0.58, **BAR)
for i, (n, amt) in enumerate(zip(sm.values[::-1], sm_amt.values[::-1])):
    ax.text(n + 3, i, f"{n} expenses ({n / sm.sum():.0%})  ·  {money(amt)}", va="center", fontsize=9.5, color=INK2)
xgrid(ax)
ax.set_xlim(0, sm.max() * 1.5)
ax.set_xlabel("Number of expenses")
title(fig, ax, "How expenses are split",
      "Equal split is the default for about 7 in 10 expenses.")
footer(fig)
save(fig, "04_split_method_usage.png")

# ---- 5. Recurring vs one-off share per group (100% stacked) ----
rec = e.pivot_table(index="group_name", columns="is_recurring_generated", values="total_amount",
                    aggfunc="sum").fillna(0)
rec.columns = ["One-off", "Recurring"]
rec = rec.div(rec.sum(axis=1), axis=0)
rec = rec.sort_values("Recurring")
fig, ax = plt.subplots(figsize=(10, 4.6))
ax.barh(rec.index, rec["Recurring"], color=C1, height=0.62, label="Recurring", **BAR)
ax.barh(rec.index, rec["One-off"], left=rec["Recurring"], color=C2, height=0.62, label="One-off", **BAR)
for i, r in enumerate(rec["Recurring"]):
    if r > 0.06:
        ax.text(r / 2, i, f"{r:.0%}", ha="center", va="center", fontsize=9.5, color="white", fontweight="bold")
    ax.text(r + (1 - r) / 2, i, f"{1 - r:.0%}", ha="center", va="center", fontsize=9.5, color="white", fontweight="bold")
ax.xaxis.set_major_formatter(lambda v, _: f"{v:.0%}")
xgrid(ax)
ax.set_xlim(0, 1)
ax.set_ylim(-0.5, len(rec) + 0.3)
ax.legend(frameon=False, ncol=2, loc="upper left", bbox_to_anchor=(0, 1.0))
overall = e.groupby("is_recurring_generated").total_amount.sum()
title(fig, ax, "Recurring vs one-off spend per group",
      f"Recurring templates generate {overall[True] / overall.sum():.0%} of all spend, mostly rent and bills.")
footer(fig)
save(fig, "05_recurring_vs_oneoff.png")

# ---- 6. Unsettled balance per member (diverging) ----
paid = e.groupby(["group_id", "payer_id"]).total_amount.sum().rename_axis(["group_id", "user_id"])
owed = sp.groupby(["group_id", "user_id"]).share_amount.sum()
s_paid = s.groupby(["group_id", "payer_id"]).amount.sum().rename_axis(["group_id", "user_id"])
s_recv = s.groupby(["group_id", "recipient_id"]).amount.sum().rename_axis(["group_id", "user_id"])
bal = pd.concat([paid, owed, s_paid, s_recv], axis=1, keys=["paid", "owed", "sp", "sr"]).fillna(0)
bal["net"] = bal.paid + bal.sp - bal.owed - bal.sr
bal = bal[bal.net.abs() >= 1].reset_index()
bal = bal.merge(u[["user_id", "display_name"]]).merge(g[["group_id", "group_name"]])
bal["label"] = bal.display_name + "  ·  " + bal.group_name
bal = bal.sort_values("net")
fig, ax = plt.subplots(figsize=(10, 9))
fig.subplots_adjust(bottom=0.06)
cols = [BLUE_POS if v > 0 else RED_NEG for v in bal.net]
ax.barh(bal.label, bal.net, color=cols, height=0.66, **BAR)
span = bal.net.abs().max()
for i, v in enumerate(bal.net):
    ax.text(v + (span * 0.012 if v > 0 else -span * 0.012), i, money(v), va="center",
            ha="left" if v > 0 else "right", fontsize=8.5, color=INK2)
ax.axvline(0, color=INK2, linewidth=1)
ax.xaxis.set_major_formatter(lambda v, _: ("-" if v < 0 else "") + money(abs(v)))
xgrid(ax)
ax.tick_params(axis="y", labelsize=9)
ax.set_xlim(-span * 1.25, span * 1.2)
ax.text(0.99, 0.02, "Is owed money →", transform=ax.transAxes, ha="right", fontsize=9.5, color=BLUE_POS, fontweight="bold")
ax.text(0.01, 0.98, "← Owes money", transform=ax.transAxes, ha="left", va="top", fontsize=9.5, color=RED_NEG, fontweight="bold")
unsettled = bal.net[bal.net > 0].sum()
title(fig, ax, "Unsettled balance per member",
      f"{money(unsettled)} is still waiting to be paid back. Balances in each group add up to zero.")
footer(fig)
save(fig, "06_unsettled_balances.png")

# ---- 7. Activity per month by event type (stacked) ----
a["year_month"] = a.event_timestamp.str[:7]
act = a.pivot_table(index="year_month", columns="event_type", values="event_id", aggfunc="count").reindex(months).fillna(0)
fig, ax = plt.subplots(figsize=(10, 5))
bottom = pd.Series(0.0, index=months)
for key, col, lab in [("create", C1, "Create"), ("edit", C2, "Edit"), ("delete", C3, "Delete")]:
    ax.bar(mlabels, act[key], bottom=bottom, color=col, width=0.62, label=lab, **BAR)
    bottom += act[key]
for i, tot in enumerate(bottom):
    ax.text(i, tot + 1.5, f"{int(tot)}", ha="center", fontsize=9, color=INK2)
ygrid(ax)
ax.set_ylim(0, bottom.max() * 1.15)
ax.set_ylabel("Events")
ax.legend(frameon=False, ncol=3, loc="upper left", bbox_to_anchor=(0, 1.0))
counts = a.event_type.value_counts()
title(fig, ax, "App activity per month",
      f"{len(a)} events: {counts['edit']} edits ({counts['edit'] / len(a):.0%}) and "
      f"{counts['delete']} deletes ({counts['delete'] / len(a):.0%}). Most activity is new entries.")
footer(fig)
save(fig, "07_activity_per_month.png")

# ---- 8. Receipt attachment rate per group ----
rc = e.groupby("group_name").has_receipt.mean().sort_values()
fig, ax = plt.subplots(figsize=(10, 4.4))
ax.barh(rc.index, rc.values, color=C1, height=0.6, **BAR)
for i, v in enumerate(rc.values):
    ax.text(v - 0.006, i, f"{v:.0%}", va="center", ha="right", fontsize=9.5, color="white", fontweight="bold")
ax.axvline(e.has_receipt.mean(), color=INK2, linewidth=1, linestyle=(0, (3, 3)))
ax.set_ylim(-0.9, len(rc) - 0.5)
ax.text(e.has_receipt.mean() + 0.004, -0.72, f"overall {e.has_receipt.mean():.0%}", fontsize=9, color=INK2, va="center")
ax.xaxis.set_major_formatter(lambda v, _: f"{v:.0%}")
xgrid(ax)
ax.set_xlim(0, 0.45)
title(fig, ax, "Expenses with a receipt photo",
      "Fewer than 1 in 3 expenses have a receipt attached.")
footer(fig)
save(fig, "08_receipt_rate_per_group.png")

# ---- 9. KPI summary tiles ----
owed_to_others = sp.merge(e[["expense_id", "payer_id"]])
owed_to_others = owed_to_others[owed_to_others.user_id != owed_to_others.payer_id].share_amount.sum()
kpis = [
    ("Total spend", money(e.total_amount.sum())),
    ("Expenses logged", f"{len(e)}"),
    ("Average expense", money(e.total_amount.mean(), 2)),
    ("Settled so far", money(s.amount.sum())),
    ("Still unsettled", money(unsettled)),
    ("Settlement rate", f"{s.amount.sum() / owed_to_others:.0%}"),
    ("Active groups", f"{len(g)}"),
    ("Receipt rate", f"{e.has_receipt.mean():.0%}"),
]
fig = plt.figure(figsize=(10, 3.6))
fig.text(0.02, 0.95, "SplitSync at a glance", fontsize=15, fontweight="bold", va="top")
fig.text(0.02, 0.86, "Key numbers from Jan to Sep 2026", fontsize=10.5, color=INK2, va="top")
cols_n, w, h = 4, 0.235, 0.33
for i, (lab, val) in enumerate(kpis):
    r, c = divmod(i, cols_n)
    x = 0.02 + c * (w + 0.01)
    y = 0.42 - r * (h + 0.04)
    fig.patches.append(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0,rounding_size=0.02",
                                      transform=fig.transFigure, facecolor="#f5f4f1", edgecolor=GRID))
    fig.text(x + 0.015, y + h - 0.07, lab, fontsize=10, color=INK2, va="top")
    fig.text(x + 0.015, y + 0.06, val, fontsize=20, fontweight="bold", color=INK, va="bottom")
footer(fig)
save(fig, "00_kpi_summary.png")

# ---- Tableau-ready workbook ----
flat = (sp.merge(e.drop(columns=["group_id"]), on="expense_id")
          .merge(u[["user_id", "display_name"]], on="user_id")
          .merge(u[["user_id", "display_name"]].rename(columns={"user_id": "payer_id", "display_name": "payer_name"}),
                 on="payer_id"))
with pd.ExcelWriter(OUT / "splitsync_tableau_data.xlsx") as xw:
    e.to_excel(xw, sheet_name="expenses", index=False)
    flat.to_excel(xw, sheet_name="expense_splits_flat", index=False)
    bal.drop(columns=["label"]).to_excel(xw, sheet_name="member_balances", index=False)
    for name in ["settlements", "groups", "users", "group_members", "activity_log", "recurring_templates", "dim_date"]:
        pd.read_csv(SRC / f"{name}.csv").to_excel(xw, sheet_name=name, index=False)
print("wrote splitsync_tableau_data.xlsx")
