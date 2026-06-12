# Data Rules

## Key Fields

Each converted item should contain:

- `id`: Stable item identifier where possible.
- `type`: `sentence` or `word`.
- `category`: Scenario/category, defaults to `未分类`.
- `english`: English sentence, word, or phrase.
- `chinese`: Chinese explanation.
- `priority`: Usually `A 必背`, `B 常用`, or `C 备用`.
- `note`: Usage tip.
- `reviewStatus`: `未学`, `学习中`, or `已掌握`.
- `sourceSheet`: Source worksheet name.

## Excel Field Mapping

The converter tolerates multiple header names:

- Category: `场景`, `分类`, `Category`, `category`, `场景分类`.
- English: `英文`, `English`, `english`, `句子`, `英语`, `单词`, `短语`, `Word`, `Phrase`.
- Chinese: `中文`, `中文意思`, `含义`, `释义`, `Chinese`, `meaning`.
- Priority: `优先级`, `Priority`, `priority`.
- Note: `使用提示`, `提示`, `Note`, `note`, `备注`.
- Review status: `复习状态`, `学习状态`, `reviewStatus`, `status`.

## Type Rule

If the source does not clearly indicate type:

- Longer English text or text with several spaces is treated as `sentence`.
- Shorter English text is treated as `word`.

## Ranking / Honor / Drawing Number Rules

This project is a travel-English learning app. It does not currently contain contestant ranking, honor-title, or drawing-number business logic.

If this repository later absorbs event-management modules, those rules must be documented in a separate section before implementation.

## Import / Export Rules

- Import source is the Excel workbook in `data/`.
- Conversion output is generated to `src/data/travel-english.json`.
- Mobile web copies data into `mobile-web/src/data/travel-english.json` during build/dev.
- Full real data is local-only and ignored by Git.
- Only sanitized samples go into `sample_data/`.

## Common Mistakes

- Uploading the full Excel workbook to GitHub.
- Changing generated JSON shape without updating desktop and mobile readers.
- Treating empty category/priority/status as fatal instead of applying defaults.
- Replacing localStorage review status with source default status.
