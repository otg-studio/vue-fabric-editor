/*
 * @Author: 秦少卫
 * @Date: 2024-10-07 17:00:17
 * @LastEditors: 秦少卫
 * @LastEditTime: 2024-10-07 17:00:59
 * @Description: api接口格式化工具
 */

import { getMockDataAll } from '@/assets/mockData';

export default class ServerApi {
  apiPath: string;
  constructor(path: string) {
    this.apiPath = path.replace('/api/', '');
  }

  // 查询详情
  get() {
    return Promise.resolve({ data: {} });
  }
  // 添加
  add() {
    return Promise.resolve({ data: {} });
  }
  // 删除
  del() {
    return Promise.resolve({ data: {} });
  }
  // 查找
  find() {
    return Promise.resolve({ data: { data: getMockDataAll(this.apiPath) } });
  }
  // 更新
  update() {
    return Promise.resolve({ data: {} });
  }

  IGet() {
    return Promise.resolve({ data: { data: getMockDataAll(this.apiPath) } });
  }
  IPost() {
    return Promise.resolve({ data: {} });
  }
}
