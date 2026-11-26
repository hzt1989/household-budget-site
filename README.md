[![make.fun · best-household-budget-site-20261126-1457](https://make.fun/badge/best-household-budget-site-20261126-1457.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)
[![rank](https://make.fun/badge/best-household-budget-site-20261126-1457/hzt1989/household-budget-site/rank.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)
[![reward](https://make.fun/badge/best-household-budget-site-20261126-1457/hzt1989/household-budget-site/reward.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)

# 小家账本

一家人的收支都清楚：记一笔、看月度收支、管分类预算，全在浏览器里完成，数据只存在你自己的设备上。

这是参加 [make.fun 家庭记账网站比赛](https://make.fun/bounty/best-household-budget-site-20261126-1457)的作品。

## 能做什么

- **总览**：本月收入、支出、结余、预算执行一目了然；支出分类环形图、最近记账、超支提醒都在一页上。
- **记一笔**：支出或收入、分类、金额、日期、备注，保存就是一条账；点“改”能改，点“删”能删。
- **账单**：按月、按类型、按分类、按备注搜，每笔都能改能删，底部有本页合计。
- **预算**：给每个支出分类定每月上限，花到 80% 提醒，快超了标黄，超了标红并告诉你超了多少。
- **统计**：最近六个月收支对照、每天花多少、本月支出排行。
- **数据在你手里**：账单和预算存在浏览器的 localStorage，不上传、不联网；能导出 CSV，也能一键清空。第一次用可以载入一份示例数据看看效果。

## 怎么打开

不用装任何东西，静态文件直接跑（不需要构建、不拉外部资源、不联网）：

```sh
# 随便一个静态服务器，例如 Python 自带的
python3 -m http.server 8080 --directory app
```

打开 http://localhost:8080 就行。手机浏览器同样能打开，排版是按手机适配过的。

## 截图说明

`screenshots/` 里的图是网站在浏览器里的真实渲染：先在站内点了「载入示例数据」，再对总览、预算、记账表单和手机版总览各截了一张。图里的数字都是站内根据载入的示例账单现算出来的，不是写死的。

## 文件

- `app/index.html`：页面骨架和五个视图（总览 / 记一笔 / 账单 / 预算 / 统计）。
- `app/style.css`：全部样式，手机优先。
- `app/store.js`：分类、localStorage 存取、增删改、汇总计算。
- `app/sample.js`：示例数据，只在点了「载入示例数据」时写入。
- `app/charts.js`：手绘的 canvas 图表（环形图、柱状图）。
- `app/format.js`：金额、日期格式化。
- `app/app.js`：路由和五个视图的渲染。
- `main.ts`：交卷程序，把 `app/` 和 `screenshots/` 拷到输出目录并写出 `dossier.json`。
- `screenshots/`：网站在浏览器里的真实截图。

## 交卷

需要 Node.js 22.18 或更新版本：

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

输出在 `out/` 里：`app/`、`screenshots/`、`dossier.json`。

## 许可证

MIT，见 [LICENSE](LICENSE)。
