# -*- coding: utf-8 -*-
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame,
                                Paragraph, Spacer, Table, TableStyle,
                                KeepTogether)

# 中文支持
pdfmetrics.registerFont(UnicodeCIDFont('STSong-Light'))
FONT = 'STSong-Light'

# 配色
PRIMARY = colors.HexColor('#1B9C85')
PRIMARY_D = colors.HexColor('#137A69')
DARK = colors.HexColor('#1F2D3D')
MUTED = colors.HexColor('#5A6B7B')
LIGHTBG = colors.HexColor('#EAF7F3')
ACCENT = colors.HexColor('#F2A93B')
WHITE = colors.white

PAGE_W, PAGE_H = A4
LM = RM = 16 * mm
TM = 16 * mm
BM = 16 * mm

features = [
    ("01", "AI 对话式行程生成", "核心",
     "像聊天一样说出目的地、预算与偏好，≤15 秒生成完整行程：小众打卡点 · 交通衔接 · 餐饮推荐 · 预算分配。"),
    ("02", "行程可编辑与即时重排", "体验",
     "增删改任意项目，AI 实时重排并刷新预算与时间线，出行方案随想法自由生长。"),
    ("03", "用户标签与画像", "数据",
     "采集兴趣、年龄、出发地、消费偏好，沉淀为同频匹配的基础资产，越用越准。"),
    ("04", "智能匹配组队", "核心",
     "按兴趣 / 年龄 / 出发地 / 消费偏好，匹配 4-8 名同频年轻人组成小团，告别大团尴尬。"),
    ("05", "组队沟通与确认", "社交",
     "团内沟通、敲定时间、出行前确认，支持退出与替补，从组队到出发一气呵成。"),
    ("06", "行中助手（延伸）", "规划中",
     "实时导航、打卡提醒、集体相册，让出行过程中的每一步都更顺手。"),
    ("07", "安全与信用机制（延伸）", "安全",
     "实名、信用分、行程共享、紧急联系与举报通道，为陌生人社交兜底。"),
]

highlights = [
    ("自由 × 省心 合一", "把定制游的「自由」与跟团游的「省心」缝进同一条链路。"),
    ("15 秒告别攻略焦虑", "不再在无数攻略里耗数小时，张嘴说一句，行程就有了。"),
    ("同频小团拒绝尴尬", "4-8 人精准匹配，逃离大团人群参差与节奏错配。"),
    ("全链路一站式", "规划 → 组队 → 出行，不用来回跳转多个 App。"),
    ("安全优先的社交", "实名 + 信用 + 行程共享 + 举报，放心和同频伙伴出发。"),
]

def P(text, size=10.5, color=DARK, leading=None, align=TA_LEFT, bold=False):
    lead = leading or size * 1.5
    return Paragraph(text, _style(size, color, lead, align, bold))

_styles = {}
def _style(size, color, leading, align, bold):
    key = (size, color.hexval(), leading, align, bold)
    if key not in _styles:
        from reportlab.lib.styles import ParagraphStyle
        _styles[key] = ParagraphStyle(
            's%d' % len(_styles), fontName=FONT, fontSize=size,
            textColor=color, leading=leading, alignment=align,
            spaceAfter=2)
    return _styles[key]

def header_footer(canvas, doc):
    canvas.saveState()
    # 顶部细线
    canvas.setFillColor(PRIMARY)
    canvas.rect(0, PAGE_H - 6 * mm, PAGE_W, 6 * mm, fill=1, stroke=0)
    # 页脚
    canvas.setFillColor(MUTED)
    canvas.setFont(FONT, 8)
    canvas.drawString(LM, 10 * mm, "凑一队 · AI 驱动的短途旅行平台")
    canvas.drawRightString(PAGE_W - RM, 10 * mm, "主要功能与亮点  ·  v1.0")
    canvas.setStrokeColor(colors.HexColor('#DDE5E9'))
    canvas.line(LM, 13 * mm, PAGE_W - RM, 13 * mm)
    canvas.restoreState()

def build():
    out = "凑一队_功能与亮点.pdf"
    doc = BaseDocTemplate(out, pagesize=A4,
                          leftMargin=LM, rightMargin=RM,
                          topMargin=TM, bottomMargin=BM,
                          title="凑一队 主要功能与亮点",
                          author="凑一队 CYD")
    frame = Frame(LM, BM, PAGE_W - LM - RM, PAGE_H - TM - BM, id='main')
    doc.addPageTemplates([PageTemplate(id='all', frames=[frame],
                                       onPage=header_footer)])

    W = PAGE_W - LM - RM
    story = []

    # 标题区
    title_tbl = Table([[P("凑一队", 26, WHITE, 30, TA_LEFT),
                        P("主要功能<br/>与亮点", 13, LIGHTBG, 16, TA_CENTER)]],
                     colWidths=[W * 0.62, W * 0.38])
    title_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, 0), PRIMARY),
        ('BACKGROUND', (1, 0), (1, 0), PRIMARY_D),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
        ('TOPPADDING', (0, 0), (-1, -1), 16),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 16),
    ]))
    story.append(title_tbl)
    story.append(Spacer(1, 6))

    # 一句话定位
    story.append(P("AI 驱动的短途旅行平台 —— 像聊天一样说走就走，再凑一队同频伙伴一起出发。",
                   11, MUTED, 16))
    story.append(Spacer(1, 8))

    # 数据徽章
    badges = [("15 秒", "出个性化行程"), ("4-8 人", "同频小团"),
              ("18-30 岁", "目标用户"), ("全链路", "规划到出行")]
    cells = []
    for big, small in badges:
        inner = Table([[P(big, 15, PRIMARY, 18, TA_CENTER)],
                       [P(small, 9, MUTED, 12, TA_CENTER)]],
                     colWidths=[W / 4 - 4])
        inner.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), LIGHTBG),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CDE9E2')),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ]))
        cells.append(inner)
    badge_row = Table([cells], colWidths=[W / 4] * 4)
    badge_row.setStyle(TableStyle([('LEFTPADDING', (0, 0), (-1, -1), 2),
                                   ('RIGHTPADDING', (0, 0), (-1, -1), 2)]))
    story.append(badge_row)
    story.append(Spacer(1, 14))

    # 主要功能
    story.append(P("主要功能", 15, PRIMARY_D, 20))
    story.append(Table([['']], colWidths=[W], rowHeights=[2],
                       style=TableStyle([('BACKGROUND', (0, 0), (-1, -1), PRIMARY)])))
    story.append(Spacer(1, 8))

    for num, title, tag, desc in features:
        tag_color = {'核心': PRIMARY, '安全': ACCENT, '社交': PRIMARY_D,
                     '数据': MUTED, '体验': MUTED, '规划中': MUTED}.get(tag, MUTED)
        num_cell = Table([[P(num, 13, WHITE, 15, TA_CENTER)]], colWidths=[30])
        num_cell.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), PRIMARY),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        tag_chip = Table([[P(tag, 8.5, WHITE, 11, TA_CENTER)]], colWidths=[34])
        tag_chip.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), tag_color),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))
        head = Table([[tag_chip, P(title, 12.5, DARK, 16, TA_LEFT)]],
                     colWidths=[40, W - 78])
        head.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                                  ('LEFTPADDING', (0, 0), (0, 0), 0)]))
        body = P(desc, 10, MUTED, 15)
        block = Table([[num_cell, head], ['', body]],
                      colWidths=[38, W - 38])
        block.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LINEBELOW', (0, 1), (-1, 1), 0.4, colors.HexColor('#E3EAEE')),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 1), (-1, 1), 8),
            ('LEFTPADDING', (1, 0), (1, 0), 8),
            ('LEFTPADDING', (1, 1), (1, 1), 8),
        ]))
        story.append(KeepTogether([block, Spacer(1, 4)]))

    # 产品亮点
    story.append(Spacer(1, 12))
    story.append(P("产品亮点", 15, PRIMARY_D, 20))
    story.append(Table([['']], colWidths=[W], rowHeights=[2],
                       style=TableStyle([('BACKGROUND', (0, 0), (-1, -1), PRIMARY)])))
    story.append(Spacer(1, 8))

    hl_rows = []
    for h, d in highlights:
        hl_rows.append(['',
                        P("◆ " + h, 11.5, PRIMARY_D, 15),
                        P(d, 9.5, MUTED, 14)])
    hl_tbl = Table(hl_rows, colWidths=[4, W * 0.30, W * 0.70 - 4])
    hl_style = [
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BACKGROUND', (0, 0), (0, -1), PRIMARY),
        ('LEFTPADDING', (1, 0), (1, -1), 8),
        ('RIGHTPADDING', (2, 0), (2, -1), 8),
        ('LEFTPADDING', (2, 0), (2, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]
    for i in range(len(highlights)):
        if i % 2 == 1:
            hl_style.append(('BACKGROUND', (1, i), (2, i), LIGHTBG))
    hl_tbl.setStyle(TableStyle(hl_style))
    story.append(hl_tbl)

    story.append(Spacer(1, 12))
    story.append(P("一个人不敢去的地方，我们凑一队，就出发了。🌱", 10.5, PRIMARY, 15, TA_CENTER))

    doc.build(story)
    print("PDF generated:", out)

if __name__ == '__main__':
    build()
