"""Moldura comum das telas: HTML base, marca, ícones, barras do app e da web."""

CSS = "../_assets/base.css"


def page(body, cls, w, h):
    return f"""<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<link rel="stylesheet" href="{CSS}">
<style>body{{width:{w}px;height:{h}px}}</style></head>
<body><div class="{cls}">{body}</div></body></html>"""


# ---------------------------------------------------------------- marca
def mark(size=26, color="#132A4E"):
    """Capelo acadêmico simplificado — mesma ideia do material do projeto."""
    return f"""<svg width="{size}" height="{size}" viewBox="0 0 28 28" fill="none">
<path d="M3 10.2 14 5.2l11 5-11 5-11-5Z" stroke="{color}" stroke-width="1.9" stroke-linejoin="round"/>
<path d="M7.6 12.4v5.4c0 1.9 2.9 3.4 6.4 3.4s6.4-1.5 6.4-3.4v-5.4" stroke="{color}" stroke-width="1.9" stroke-linecap="round"/>
<path d="M24.6 10.6v6.1" stroke="{color}" stroke-width="1.9" stroke-linecap="round"/></svg>"""


def logo(size="", color="#132A4E"):
    px = 30 if size == "lg" else 22
    return f'<div class="logo">{mark(px,color)}<span class="word {size}" style="color:{color}">CONECTA</span></div>'


# ---------------------------------------------------------------- ícones
_P = {
    "avisos": '<path d="M4 9v4h3l5 4V5L7 9H4Z"/><path d="M15.5 8.2a4 4 0 0 1 0 5.6"/>',
    "agenda": '<rect x="3.5" y="4.5" width="15" height="14" rx="2.5"/><path d="M7 2.8v3.4M15 2.8v3.4M3.5 9h15"/>',
    "turmas": '<path d="M11 3 19 7l-8 4-8-4 8-4Z"/><path d="M6 9.3V14c0 1.4 2.2 2.6 5 2.6s5-1.2 5-2.6V9.3"/>',
    "horarios": '<circle cx="11" cy="11" r="7.5"/><path d="M11 6.6V11l3 1.8"/>',
    "perfil": '<circle cx="11" cy="7.8" r="3.6"/><path d="M4.4 18.4c.6-3.3 3.4-5.2 6.6-5.2s6 1.9 6.6 5.2"/>',
    "painel": '<rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.6"/><rect x="12" y="3.5" width="6.5" height="6.5" rx="1.6"/><rect x="3.5" y="12" width="6.5" height="6.5" rx="1.6"/><rect x="12" y="12" width="6.5" height="6.5" rx="1.6"/>',
    "usuarios": '<circle cx="8.6" cy="7.6" r="3.2"/><path d="M3 18c.5-2.9 2.9-4.6 5.6-4.6s5.1 1.7 5.6 4.6"/><path d="M14.8 5.1a3.1 3.1 0 0 1 0 5.6M16.4 13.8c1.4.7 2.3 2.1 2.6 4.2"/>',
    "solicitacoes": '<path d="M5.5 3.5h11v15l-5.5-3-5.5 3v-15Z"/>',
    "busca": '<circle cx="9.6" cy="9.6" r="5.8"/><path d="M14 14l4 4"/>',
    "mais": '<path d="M11 4.5v13M4.5 11h13"/>',
    "menu": '<path d="M4 6.5h14M4 11h14M4 15.5h14"/>',
    "voltar": '<path d="M13 4.5 6.5 11l6.5 6.5"/>',
    "filtro": '<path d="M3.5 5.5h15M6.5 11h9M9.5 16.5h3"/>',
    "sino": '<path d="M11 3.5a5 5 0 0 0-5 5v3.4L4.5 15h13L16 11.9V8.5a5 5 0 0 0-5-5Z"/><path d="M9 17.5a2 2 0 0 0 4 0"/>',
    "check": '<path d="M4.5 11.3 9 15.5l8.5-9"/>',
    "x": '<path d="M5.5 5.5l11 11M16.5 5.5l-11 11"/>',
    "lapis": '<path d="M13.6 3.9 17.1 7.4 7.6 16.9l-4.1.7.7-4.1 9.4-9.6Z"/>',
    "arquivo": '<rect x="3.5" y="4" width="15" height="4" rx="1.3"/><path d="M5 8.5v8.2c0 .8.6 1.3 1.3 1.3h9.4c.7 0 1.3-.5 1.3-1.3V8.5M8.8 11.8h4.4"/>',
    "lixo": '<path d="M4.5 6h13M8.3 6V4.2h5.4V6M6.2 6l.8 11.2c0 .7.6 1.3 1.3 1.3h5.4c.7 0 1.3-.6 1.3-1.3L15.8 6"/>',
    "historico": '<path d="M3.6 11a7.4 7.4 0 1 0 2.2-5.2"/><path d="M3.3 3.6v3.6h3.6M11 7v4.3l2.8 1.6"/>',
    "relogio": '<circle cx="11" cy="11" r="7.5"/><path d="M11 6.6V11l3 1.8"/>',
    "local": '<path d="M11 18.5s6-5 6-9a6 6 0 1 0-12 0c0 4 6 9 6 9Z"/><circle cx="11" cy="9.4" r="2.2"/>',
    "cadeado": '<rect x="4.5" y="9.5" width="13" height="9" rx="2.2"/><path d="M7.6 9.5V7.2a3.4 3.4 0 0 1 6.8 0v2.3"/>',
    "seta": '<path d="M4.5 11h13M12 5.5l5.5 5.5-5.5 5.5"/>',
    "escudo": '<path d="M11 3.2 4.6 5.6v4.9c0 4 2.7 6.9 6.4 8.3 3.7-1.4 6.4-4.3 6.4-8.3V5.6L11 3.2Z"/>',
    "sair": '<path d="M8.5 4.5H5.2c-.9 0-1.7.8-1.7 1.7v9.6c0 .9.8 1.7 1.7 1.7h3.3M13 7.5 16.5 11 13 14.5M16.5 11H8"/>',
    "livro": '<path d="M3.5 4.6h5c1.4 0 2.5 1.1 2.5 2.5v10c0-1.1-1.1-2-2.5-2h-5v-10Z"/><path d="M18.5 4.6h-5A2.5 2.5 0 0 0 11 7.1v10c0-1.1 1.1-2 2.5-2h5v-10Z"/>',
    "info": '<circle cx="11" cy="11" r="7.5"/><path d="M11 10v5M11 7.2v.6"/>',
    "lua": '<path d="M17.8 13.4A7 7 0 0 1 8.6 4.2a7 7 0 1 0 9.2 9.2Z"/>',
    "sol": '<circle cx="11" cy="11" r="3.6"/><path d="M11 2.8v1.8M11 17.4v1.8M2.8 11h1.8M17.4 11h1.8M5.2 5.2l1.3 1.3M15.5 15.5l1.3 1.3M5.2 16.8l1.3-1.3M15.5 6.5l1.3-1.3"/>',
    "inbox": '<path d="M3.5 11.5h4l1.3 2.4h4.4l1.3-2.4h4"/><path d="M5.6 4.6h10.8l2.1 6.9v4.4c0 1-.8 1.6-1.7 1.6H5.2c-.9 0-1.7-.6-1.7-1.6v-4.4l2.1-6.9Z"/>',
}


def ic(name, size=20, color="currentColor", sw=1.6):
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 22 22" fill="none" stroke="{color}" '
            f'stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round">{_P[name]}</svg>')


# ---------------------------------------------------------------- mobile
def statusbar(dark=False):
    c = "#fff" if dark else "#132A4E"
    return f"""<div class="statusbar{' on-navy' if dark else ''}"><span>9:41</span>
<div class="row gap6">
<svg width="18" height="12" viewBox="0 0 18 12" fill="{c}"><rect x="0" y="7" width="3" height="5" rx="1"/><rect x="4.6" y="5" width="3" height="7" rx="1"/><rect x="9.2" y="2.6" width="3" height="9.4" rx="1"/><rect x="13.8" y="0" width="3" height="12" rx="1" opacity=".3"/></svg>
<svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="{c}" stroke-width="1.5" stroke-linecap="round"><path d="M1 4.3a10 10 0 0 1 14 0M3.6 6.9a6.4 6.4 0 0 1 8.8 0"/><circle cx="8" cy="10" r="1.1" fill="{c}" stroke="none"/></svg>
<svg width="25" height="12" viewBox="0 0 25 12" fill="none"><rect x=".6" y=".6" width="20" height="10.8" rx="3" stroke="{c}" opacity=".4"/><rect x="2.4" y="2.4" width="14" height="7.2" rx="1.8" fill="{c}"/><path d="M22.4 4.2v3.6c1-.4 1.4-1 1.4-1.8s-.4-1.4-1.4-1.8Z" fill="{c}" opacity=".5"/></svg>
</div></div>"""


TABS = [("avisos", "Avisos"), ("agenda", "Agenda"), ("turmas", "Turmas"),
        ("horarios", "Horários"), ("perfil", "Perfil")]


def tabbar(active):
    items = ""
    for key, label in TABS:
        on = " on" if key == active else ""
        col = "#2563EB" if key == active else "#8A99B0"
        items += f'<div class="tab{on}">{ic(key,22,col,1.7)}<span>{label}</span></div>'
    return f'<div class="tabbar">{items}</div><div class="home-ind"></div>'


def appbar(title, left=None, right="", sub=None, bordered=True):
    left_html = f'<div class="row center" style="width:34px;height:34px;margin-left:-6px">{left}</div>' if left else ""
    sub_html = f'<div class="sub mt4">{sub}</div>' if sub else ""
    return f"""<div class="appbar{' bordered' if bordered else ''}">
<div class="row between center" style="min-height:40px">
<div class="row center gap10">{left_html}<div class="h2">{title}</div></div>
<div class="row center gap14">{right}</div></div>{sub_html}</div>"""


def mobile(body, tab=None, dark_status=False, tinted=False, bare=False):
    inner = statusbar(dark_status) + body + (tabbar(tab) if tab else "")
    if bare:
        inner = statusbar(dark_status) + body
    return page(inner, "frame-mobile", 390, 844)


# ---------------------------------------------------------------- web
NAV_COORD = [
    ("Acompanhar", [("painel", "Painel", None)]),
    ("Comunicação", [("avisos", "Avisos", None), ("agenda", "Agenda", None)]),
    ("Acadêmico", [("turmas", "Turmas", None), ("horarios", "Horários", None),
                   ("solicitacoes", "Solicitações", "7")]),
    ("Administração", [("usuarios", "Usuários", None)]),
]
NAV_DOC = [
    ("Acompanhar", [("painel", "Painel", None)]),
    ("Comunicação", [("avisos", "Meus avisos", None), ("agenda", "Agenda", None)]),
    ("Acadêmico", [("turmas", "Minhas turmas", None), ("horarios", "Horários", None),
                   ("solicitacoes", "Solicitações", "2")]),
]


def sidebar(active, nav=None, user=("Marina Duarte", "Coordenação", "MD")):
    nav = nav or NAV_COORD
    groups = ""
    for cap, items in nav:
        lis = ""
        for key, label, count in items:
            on = " on" if label == active else ""
            col = "#1D4ED8" if label == active else "#5B6B86"
            badge = f'<span class="count">{count}</span>' if count else ""
            lis += f'<div class="nav-i{on}">{ic(key,19,col)}<span>{label}</span>{badge}</div>'
        groups += f'<div class="nav-g"><div class="cap">{cap}</div>{lis}</div>'
    nome, papel, ini = user
    return f"""<div class="side">
<div style="padding:4px 12px 2px">{logo()}</div>
{groups}
<div class="grow"></div>
<div class="rule" style="margin:0 12px"></div>
<div class="row center gap10" style="padding:14px 12px 2px">
<div class="avatar sm">{ini}</div>
<div class="col"><span style="font-size:13px;font-weight:600;color:#132A4E">{nome}</span>
<span class="meta">{papel}</span></div>
<div class="grow"></div>{ic('sair',18,'#8A99B0')}</div></div>"""


def topbar(title, sub=None, actions=""):
    sub_html = f'<div class="meta mt4">{sub}</div>' if sub else ""
    return f"""<div class="topbar">
<div class="col"><div class="h3" style="font-size:17px">{title}</div>{sub_html}</div>
<div class="grow"></div>
<div class="row center gap16">
<div class="row center gap8" style="height:34px;padding:0 12px;border:1px solid #E4E9F2;border-radius:9px">
{ic('livro',16,'#5B6B86')}<span style="font-size:12.5px;font-weight:600;color:#2A4374">2026/2</span></div>
{actions}</div></div>"""


def web(body, active, nav=None, user=("Marina Duarte", "Coordenação", "MD")):
    return page(sidebar(active, nav, user) + f'<div class="main">{body}</div>', "frame-web", 1440, 900)
