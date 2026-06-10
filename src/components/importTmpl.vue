<!--
 * @Author: 秦少卫
 * @Date: 2022-09-03 19:16:55
 * @LastEditors: 秦少卫
 * @LastEditTime: 2025-03-18 19:01:39
 * @Description: 导入模板
-->

<template>
  <div>
    <div style="margin-bottom: 10px; margin-top: 10px">
      <RadioGroup v-model="storageMode" type="button" @on-change="modeChange" style="width: 100%">
        <Radio label="cloud" style="width: 50%; text-align: center">官方模板</Radio>
        <Radio label="local" style="width: 50%; text-align: center">本機儲存</Radio>
      </RadioGroup>
    </div>

    <!-- 搜索组件 -->
    <div class="search-box" v-if="storageMode === 'cloud'">
      <Select
        class="select"
        v-model="typeValue"
        @on-change="changeSelectType"
        :disabled="pageLoading"
      >
        <Option v-for="item in typeList" :value="item.value" :key="item.value">
          {{ item.label }}
        </Option>
      </Select>
      <Input
        class="input"
        :placeholder="`在${typeText}中搜索`"
        v-model="searchKeyWord"
        search
        :disabled="pageLoading"
        @on-search="startGetList"
      />
    </div>
    <!-- 列表 -->
    <div style="height: calc(100vh - 150px)" id="myTemplBox">
      <Scroll
        key="mysscroll"
        v-if="storageMode === 'cloud' && showScroll"
        :on-reach-bottom="nextPage"
        :height="scrollHeight"
        :distance-to-edge="[-1, -1]"
      >
        <!-- 列表 -->
        <div class="list-box">
          <Tooltip :content="info.name" v-for="info in pageData" :key="info.src" placement="top">
            <div class="tmpl-img-box">
              <Image
                lazy
                :src="info.previewSrc"
                fit="contain"
                height="100%"
                :alt="info.name"
                @click="beforeClearTip(info)"
              />
            </div>
          </Tooltip>
        </div>
        <Spin size="large" fix :show="pageLoading"></Spin>

        <Divider plain v-if="isDownBottm">已经到底了</Divider>
      </Scroll>

      <!-- 本機模板 -->
      <div
        v-if="storageMode === 'local'"
        style="overflow-y: auto; height: 100%; padding-bottom: 20px"
      >
        <div class="list-box">
          <Tooltip
            :content="info.name"
            v-for="info in localTemplates"
            :key="info.id"
            placement="top"
          >
            <div class="tmpl-img-box" style="position: relative; margin-bottom: 10px">
              <Image
                lazy
                :src="info.thumbnail"
                fit="contain"
                height="100%"
                :alt="info.name"
                @click="beforeClearLocalTip(info)"
              />
              <div
                style="
                  position: absolute;
                  top: 0;
                  right: 0;
                  background: rgba(0, 0, 0, 0.5);
                  border-radius: 0 5px 0 5px;
                  z-index: 10;
                "
              >
                <Button
                  type="text"
                  size="small"
                  icon="md-trash"
                  @click.stop="deleteLocal(info.id)"
                  style="color: white"
                ></Button>
              </div>
            </div>
          </Tooltip>
        </div>
        <div
          v-if="localTemplates.length === 0"
          style="text-align: center; width: 100%; margin-top: 50px; color: #999"
        >
          尚無本機儲存模板
        </div>
      </div>
    </div>
  </div>
</template>

<script setup name="ImportTmpl">
import useSelect from '@/hooks/select';
import usePageList from '@/hooks/pageList';
import { Spin, Modal } from 'view-ui-plus';
import { debounce } from 'lodash-es';

import { useI18n } from 'vue-i18n';
import { useRouter, useRoute } from 'vue-router';
const router = useRouter();
const route = useRoute();
const { t } = useI18n();
const { canvasEditor } = useSelect();

const {
  startPage,
  typeValue,
  typeText,
  typeList,
  pageLoading,
  pageData,
  searchKeyWord,
  isDownBottm,
  startGetList,
  nextPage,
  showScroll,
  scrollHeight,
  getInfo,
} = usePageList({
  typeUrl: 'templ-types',
  listUrl: 'templs',
  searchTypeKey: 'templ_type',
  searchWordKey: 'name',
  pageSize: 10,
  scrollElement: '#myTemplBox',
  fields: ['name'],
});

typeValue.value = 20;

// 替换提示
const beforeClearTip = (info) => {
  Modal.confirm({
    title: t('tip'),
    content: `<p>${t('replaceTip')}</p>`,
    okText: t('ok'),
    cancelText: t('cancel'),
    onOk: () => getTempData(info),
  });
};

onMounted(() => {
  startPage();
  getTemplInfo();
});

// 获取模板数据
const getTempData = async (info) => {
  Spin.show({
    render: (h) => h('div', t('alert.loading_data')),
  });
  const infoRes = await getInfo(info.id);
  if (route.query.admin) {
    router.replace('/?tempId=' + info.id + '&admin=true');
  } else {
    router.replace('/?tempId=' + info.id);
  }
  canvasEditor.loadJSON(JSON.stringify(infoRes.data.data.attributes.json), Spin.hide);
};

const getTemplInfo = async () => {
  if (route.query.tempId) {
    try {
      const infoRes = await getInfo(route.query.tempId);
      canvasEditor.loadJSON(JSON.stringify(infoRes.data.data.attributes.json), Spin.hide);
    } catch (error) {
      console.log(error);
    }
  }
};

const storageMode = ref('cloud');
const localTemplates = ref([]);

const loadLocal = async () => {
  const { getLocalTemplates } = await import('@/utils/localDB');
  localTemplates.value = await getLocalTemplates();
};

const modeChange = (val) => {
  if (val === 'local') {
    loadLocal();
  }
};

const beforeClearLocalTip = (info) => {
  Modal.confirm({
    title: t('tip'),
    content: `<p>${t('replaceTip')}</p>`,
    okText: t('ok'),
    cancelText: t('cancel'),
    onOk: () => {
      Spin.show({ render: (h) => h('div', t('alert.loading_data')) });
      canvasEditor.loadJSON(info.json, Spin.hide);
    },
  });
};

const deleteLocal = async (id) => {
  Modal.confirm({
    title: '刪除提示',
    content: '<p>確定要刪除此本機模板嗎？</p>',
    onOk: async () => {
      const { deleteLocalTemplate } = await import('@/utils/localDB');
      await deleteLocalTemplate(id);
      loadLocal();
    },
  });
};

const changeSelectType = debounce(() => {
  startGetList();
}, 100);
</script>

<style scoped lang="less">
.search-box {
  padding-top: 10px;
  padding-bottom: 10px;
  display: flex;
  .input {
    margin-left: 10px;
  }
  .select {
    width: 100px;
  }
}

.list-box {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
}

.tmpl-img-box {
  width: 140px;
  cursor: pointer;
  border-radius: 5px;
  overflow: hidden;
  &:hover {
    :deep(.ivu-image-img) {
      opacity: 0.8;
    }
  }
}
</style>
