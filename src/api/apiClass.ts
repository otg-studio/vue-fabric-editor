/*
 * @Author: 秦少卫
 * @Date: 2024-10-07 17:00:17
 * @LastEditors: 秦少卫
 * @LastEditTime: 2024-10-07 17:00:59
 * @Description: api接口格式化工具
 */

import { getMockDataAll } from '@/assets/mockData';

interface IPageParams {
  [key: string]: any;
  pagination?: {
    page: number;
    pageSize: number;
  };
}

export default class ServerApi {
  apiPath: string;
  constructor(path: string, hasToken?: boolean) {
    this.apiPath = path.replace('/api/', '');
  }

  // 查询详情
  get(id: string | number, data = {}) {
    return Promise.resolve({ data: {} });
  }
  // 添加
  add(data = {}) {
    return Promise.resolve({ data: {} });
  }
  // 删除
  del(id: string | number) {
    return Promise.resolve({ data: {} });
  }
  // 查找
  find(data = {} as IPageParams, pageSize?: number) {
    return Promise.resolve({ data: { data: getMockDataAll(this.apiPath) } });
  }
  // 更新
  update(id: string, data = {}) {
    return Promise.resolve({ data: {} });
  }

  IGet(data = {}, skip = true) {
    return Promise.resolve({ data: { data: getMockDataAll(this.apiPath) } });
  }
  IPost(data = {}, skip = true) {
    return Promise.resolve({ data: {} });
  }
}
