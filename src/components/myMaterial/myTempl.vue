<!--
 * @Author: 秦少卫
 * @Date: 2022-09-03 19:16:55
 * @LastEditors: June 1601745371@qq.com
 * @LastEditTime: 2024-06-12 14:20:11
 * @Description: 导入模板
-->

<template>
  <div>
    <!-- 搜索组件 -->
    <div style="margin-bottom: 10px">
      <RadioGroup v-model="storageMode" type="button" @on-change="modeChange" style="width: 100%">
        <Radio label="cloud" style="width: 50%; text-align: center">
          {{ $t('ui.cloudTemplates') }}
        </Radio>
        <Radio label="local" style="width: 50%; text-align: center">
          {{ $t('ui.localTemplates') }}
        </Radio>
      </RadioGroup>
    </div>

    <div class="search-box" v-if="storageMode === 'cloud'">
      <Dropdown @on-click="createType" placement="bottom-start" style="margin-right: 10px" transfer>
        <Button type="primary" icon="md-add"></Button>
        <template #list>
          <DropdownMenu>
            <DropdownItem name="file">{{ $t('ui.createDesign') }}</DropdownItem>
            <DropdownItem name="fileType">{{ $t('ui.newFolder') }}</DropdownItem>
          </DropdownMenu>
        </template>
      </Dropdown>

      <Input
        class="input"
        :placeholder="$t('ui.plsInputKeyword')"
        v-model="filters.name.$contains"
        search
        :disabled="pageLoading"
        @on-search="startGetList"
      />
    </div>

    <!-- 面包屑导航 -->
    <Breadcrumb>
      <BreadcrumbItem
        @click="toFile(item.parentId, i)"
        :key="item.id"
        v-for="(item, i) in filePath"
      >
        {{ item.name }}
      </BreadcrumbItem>
    </Breadcrumb>

    <!-- 列表 -->
    <div style="height: calc(100vh - 160px)" id="myFileTemplBox">
      <!-- 雲端模板 -->
      <Scroll
        key="myFileTemplBox"
        v-if="storageMode === 'cloud' && showScroll"
        :on-reach-bottom="nextPage"
        :height="scrollHeight"
        :distance-to-edge="[-1, -1]"
      >
        <!-- 列表 -->
        <div v-for="info in pageData" :key="info.name" class="item">
          <!-- 文件夹样式 -->
          <fileType
            v-if="info.type === 'fileType'"
            :itemId="info.id"
            :name="info.name"
            @select="() => joinFileTyper(info.id, info.name)"
            @change="startGetList"
          ></fileType>

          <file
            v-else
            :src="info.src"
            :json="info.json"
            :previewSrc="info.previewSrc"
            :itemId="info.id"
            :name="info.name"
            @change="startGetList"
          ></file>
        </div>
        <Spin size="large" fix :show="pageLoading"></Spin>
        <Divider plain v-if="isDownBottom">{{ $t('ui.bottomed') }}</Divider>
      </Scroll>

      <!-- 本機模板 -->
      <div
        v-if="storageMode === 'local'"
        style="overflow-y: auto; height: 100%; display: flex; flex-wrap: wrap"
      >
        <div v-for="info in localTemplates" :key="info.id" class="item" style="margin-bottom: 10px">
          <file
            :isLocal="true"
            :src="info.thumbnail"
            :json="info.json"
            :previewSrc="info.thumbnail"
            :itemId="info.id"
            :name="info.name"
            @change="loadLocal"
          ></file>
        </div>
        <div
          v-if="localTemplates.length === 0"
          style="text-align: center; width: 100%; margin-top: 50px; color: #999"
        >
          尚無本機儲存模板
        </div>
      </div>
    </div>

    <!-- 创建设计 -->
    <modalSzie
      :title="$t('importFiles.createDesign.title')"
      ref="modalSizeRef"
      @set="customSizeCreate"
    ></modalSzie>
  </div>
</template>

<script setup name="ImportTmpl">
import { Input } from 'view-ui-plus';
import { Spin, Modal, Message } from 'view-ui-plus';

// 组件
import fileType from './components/fileType.vue';
import file from './components/file.vue';
import modalSzie from '@/components/common/modalSzie';

// API
import { getTmplList, getFileTypeTree } from '@/api/user';
// 素材与分页
import useMaterial from '@/hooks/useMaterial';
import usePageList from '@/hooks/usePageList';
// 路由
import { useRoute } from 'vue-router';
import { ref, reactive } from 'vue';

const route = useRoute();

// 用户素材API操作
const { createdFileType, createTmpl } = useMaterial();

const storageMode = ref('cloud');
const localTemplates = ref([]);

const loadLocal = async () => {
  const { getLocalTemplates } = await import('@/utils/localDB');
  const list = await getLocalTemplates();
  localTemplates.value = list.map((item) => ({
    ...item,
    json: JSON.parse(item.json),
  }));
};

const modeChange = (val) => {
  if (val === 'local') {
    loadLocal();
  }
};

// 检索条件
const filters = reactive({
  name: {
    $contains: '',
  },
  parentId: {
    $eq: '',
    filterEmpty: false,
  },
});

const sort = ['type:desc'];

// 分页格式化
const formatData = (data) => {
  return data.map((item) => {
    return {
      id: item.id,
      name: item.name,
      type: item.type || 'file',
      desc: item.desc,
      json: item.json,
      src: item.src,
      previewSrc: item.previewSrc,
    };
  });
};
// 通用分页
const {
  pageData,
  showScroll,
  scrollHeight,
  isDownBottom,
  pageLoading,
  startPage,
  startGetList,
  nextPage,
} = usePageList({
  el: '#myFileTemplBox',
  apiClient: getTmplList,
  filters,
  sort,
  fields: ['name', 'parentId', 'type', 'externalId'],
  formatData,
});

onMounted(async () => {
  await getFileTypeTreeData();
  startPage();
});

const fileTypeName = ref('');
const modalSizeRef = ref(null);
// 新建文件
const createType = (type) => {
  if (type === 'fileType') {
    fileTypeName.value = '';
    Modal.confirm({
      title: '新建文件夹',
      render: (h) => {
        return h(Input, {
          size: 'large',
          modelValue: fileTypeName,
          autofocus: true,
          placeholder: '请输入文件夹名称',
        });
      },
      onOk: async () => {
        if (fileTypeName.value === '') {
          Message.warning('文件夹名称不能为空');
          return;
        }
        await createdFileType(fileTypeName.value, filters.parentId.$eq);
        startGetList();
      },
    });
  } else {
    modalSizeRef.value.showSetSize();
  }
};
const customSizeCreate = async (w, h) => {
  await createTmpl(w, h, filters.parentId.$eq);
  startGetList();
};

const filePath = ref([
  {
    name: '全部',
    parentId: '',
  },
]);

const getFileTypeTreeData = async () => {
  if (route?.query?.id) {
    const res = await getFileTypeTree({
      id: route.query.id,
    });
    filePath.value = res.data.data;
    const last = res.data.data[res.data.data.length - 1];
    filters.parentId.$eq = last.parentId;
  }
};
// 进入文件夹
const joinFileTyper = (id, name) => {
  filters.parentId.$eq = String(id);
  filePath.value.push({
    name: name,
    parentId: id,
  });
  startGetList();
};

// 面包屑跳转文件夹
const toFile = (id, i) => {
  const isLast = i === filePath.value.length - 1;
  if (!isLast) {
    filters.parentId.$eq = id;
    filePath.value = filePath.value.slice(0, i + 1);
    startGetList();
  }
};
</script>

<style scoped lang="less">
.search-box {
  padding-bottom: 10px;
  display: flex;
}

:deep(.ivu-scroll-content) {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  padding-right: 10px;
}
.item {
  margin-bottom: 10px;
}
:deep(.ivu-breadcrumb-item-link) {
  cursor: pointer;
  &:hover {
    color: #57a3f3;
  }
}
</style>
