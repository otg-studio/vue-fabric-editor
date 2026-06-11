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
        <Radio label="cloud" style="width: 50%; text-align: center">
          {{ $t('ui.officialTemplates') }}
        </Radio>
        <Radio label="local" style="width: 50%; text-align: center">
          {{ $t('ui.localStorage') }}
        </Radio>
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
            <div class="tmpl-img-box" style="position: relative">
              <Image
                lazy
                :src="info.previewSrc"
                fit="contain"
                height="100%"
                :alt="info.name"
                @click="beforeClearTip(info)"
              />
              <div
                style="
                  position: absolute;
                  top: 0;
                  right: 0;
                  background: rgba(0, 0, 0, 0.5);
                  border-radius: 0 5px 0 5px;
                  z-index: 10;
                  display: none;
                "
                class="hover-show-btn"
              >
                <Button
                  type="text"
                  size="small"
                  icon="md-copy"
                  @click.stop="copyId(info.id)"
                  style="color: white; padding: 0 4px"
                ></Button>
              </div>
            </div>
          </Tooltip>
        </div>
        <Spin size="large" fix :show="pageLoading"></Spin>

        <Divider plain v-if="isDownBottm">{{ $t('ui.bottomed') }}</Divider>
      </Scroll>

      <!-- 本機模板 -->
      <div
        v-if="storageMode === 'local'"
        style="overflow-y: auto; height: 100%; padding-bottom: 20px"
      >
        <div style="display: flex; justify-content: flex-end; margin-bottom: 10px">
          <Button
            size="small"
            type="primary"
            @click="exportLocalTemplates"
            style="margin-right: 8px"
          >
            匯出全部
          </Button>
          <Button size="small" type="success" @click="triggerImport">匯入</Button>
          <input
            type="file"
            ref="importInputRef"
            style="display: none"
            accept=".json"
            @change="handleImportLocal"
          />
        </div>
        <div class="list-box">
          <Dropdown
            v-for="info in localTemplates"
            :key="info.id"
            trigger="contextMenu"
            @on-click="(name) => handleLocalContextClick(name, info)"
          >
            <Tooltip :content="info.name" placement="top">
              <div class="tmpl-img-box" style="position: relative; margin-bottom: 10px">
                <Image
                  lazy
                  :src="info.thumbnail"
                  fit="contain"
                  height="100%"
                  :alt="info.name"
                  @click="beforeClearLocalTip(info)"
                />
              </div>
            </Tooltip>
            <template #list>
              <DropdownMenu>
                <DropdownItem name="copy">複製 ID</DropdownItem>
                <DropdownItem name="rename">重新命名</DropdownItem>
                <DropdownItem name="delete" style="color: #ed4014">刪除</DropdownItem>
              </DropdownMenu>
            </template>
          </Dropdown>
        </div>
        <div
          v-if="localTemplates.length === 0"
          style="text-align: center; width: 100%; margin-top: 50px; color: #999"
        >
          尚無本機儲存模板
        </div>
      </div>
    </div>

    <Modal v-model="showRenameModal" :title="$t('ui.renameTemplate')" @on-ok="confirmRenameLocal">
      <Input v-model="renameTargetName" :placeholder="$t('ui.plsInput')" autofocus />
    </Modal>
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

const showRenameModal = ref(false);
const renameTargetId = ref('');
const renameTargetName = ref('');

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
      router.replace('/?localId=' + info.id);
      canvasEditor.loadJSON(info.json, Spin.hide);
    },
  });
};

const renameLocal = (info) => {
  renameTargetId.value = info.id;
  renameTargetName.value = info.name;
  showRenameModal.value = true;
};

const copyId = (id) => {
  navigator.clipboard.writeText(id).then(() => {
    Message.success(`已複製模板 ID: ${id}`);
  });
};

import { Message } from 'view-ui-plus';

const confirmRenameLocal = async () => {
  if (!renameTargetName.value.trim()) {
    Message.warning('名稱不能為空');
    return;
  }
  const { getLocalTemplates, saveLocalTemplate } = await import('@/utils/localDB');
  const list = await getLocalTemplates();
  const existing = list.find((item) => item.id === renameTargetId.value);
  if (existing) {
    existing.name = renameTargetName.value.trim();
    existing.updatedAt = Date.now();
    await saveLocalTemplate(existing);
    loadLocal();
    Message.success('重新命名成功');
  }
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

const handleLocalContextClick = (name, info) => {
  if (name === 'copy') {
    copyId(info.id);
  } else if (name === 'rename') {
    renameLocal(info);
  } else if (name === 'delete') {
    deleteLocal(info.id);
  }
};

import { saveAs } from 'file-saver';

const importInputRef = ref(null);

const exportLocalTemplates = async () => {
  const { getLocalTemplates } = await import('@/utils/localDB');
  const list = await getLocalTemplates();
  if (!list || list.length === 0) {
    Message.warning('目前沒有本機模板可以匯出');
    return;
  }
  const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
  saveAs(blob, `local_templates_${new Date().toISOString().split('T')[0]}.json`);
};

const triggerImport = () => {
  if (importInputRef.value) {
    importInputRef.value.click();
  }
};

const handleImportLocal = async (event) => {
  const target = event.target;
  const file = target.files && target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target && e.target.result);
      if (!Array.isArray(data)) {
        Message.error('檔案格式錯誤：必須為陣列');
        return;
      }
      const { saveLocalTemplate } = await import('@/utils/localDB');
      let successCount = 0;
      for (const item of data) {
        if (item.id && item.json && item.thumbnail && item.name) {
          await saveLocalTemplate(item);
          successCount++;
        }
      }
      Message.success(`成功匯入 ${successCount} 個模板`);
      loadLocal();
    } catch (err) {
      console.error(err);
      Message.error('解析 JSON 檔案失敗');
    } finally {
      if (importInputRef.value) {
        importInputRef.value.value = '';
      }
    }
  };
  reader.readAsText(file);
};

const changeSelectType = debounce(() => {
  startGetList();
}, 100);
</script>

<style scoped lang="less">
.tmpl-img-box:hover .hover-show-btn {
  display: block !important;
}
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
