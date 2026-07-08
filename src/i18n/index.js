/**
 * 国际化资源入口。
 *
 * 目录结构:
 *   i18n/
 *     index.js      ← 当前文件,导出 { zh, en } 聚合资源
 *     resources.js  ← 兼容重导出(旧引用路径)
 *     zh/            中文模块(按功能拆分)
 *     en/            英文模块(按功能拆分)
 *
 * 新增模块时:
 *   1. 在 zh/ 和 en/ 下各新建 <module>.js,导出键值对
 *   2. 在 zh/index.js 和 en/index.js 中 import 并展开
 *
 * @author songshan.li (ID: 17099618)
 */
import { zh } from './zh/index.js';
import { en } from './en/index.js';

export const resources = { zh, en };
