<!--
 * @Description: 批次產圖元件
-->

<template>
  <Modal v-model="visible" title="批次產圖 (Batch Generate)" :width="800">
    <div style="margin-bottom: 15px">
      <p v-if="variables.length === 0" style="color: red">
        畫布中未偵測到變數！請選取畫布上的文字或圖片，在「資料 -> 變數名稱 (linkData
        第二格)」填入變數。
      </p>
      <p v-else>
        已偵測變數：
        <Tag color="blue" v-for="v in variables" :key="v">{{ v }}</Tag>
      </p>
    </div>

    <div v-if="variables.length > 0" class="data-rows">
      <div class="data-row" v-for="(row, index) in tableData" :key="index">
        <div class="row-header">
          <strong>圖片 {{ index + 1 }}</strong>
          <div>
            <Button
              v-if="row.customJson"
              type="success"
              size="small"
              style="margin-right: 10px"
              @click="previewRow(index)"
            >
              已微調 (再次編輯)
            </Button>
            <Button
              v-else
              type="primary"
              size="small"
              style="margin-right: 10px"
              @click="previewRow(index)"
            >
              預覽/微調
            </Button>
            <Button type="text" size="small" style="color: red" @click="removeRow(index)">
              刪除
            </Button>
          </div>
        </div>
        <Row :gutter="10">
          <Col :span="colSpan" v-for="v in variables" :key="v">
            <Input v-model="row[v]" :placeholder="`請輸入 ${v}`" />
          </Col>
        </Row>
      </div>
      <Button type="dashed" long @click="addRow" style="margin-top: 10px">＋ 新增一筆資料</Button>
    </div>

    <template #footer>
      <Button @click="visible = false">取消</Button>
      <Button
        type="primary"
        :loading="isGenerating"
        @click="generateBatch"
        :disabled="tableData.length === 0 || variables.length === 0"
      >
        開始批次生成 ({{ tableData.length }} 張)
      </Button>
    </template>
  </Modal>

  <!-- 浮動微調列 -->
  <div v-if="editingRowIndex !== -1" class="tweak-bar">
    <div class="tweak-info">正在微調：圖片 {{ editingRowIndex + 1 }}</div>
    <Button type="primary" @click="saveTweak">儲存微調</Button>
    <Button style="margin-left: 10px" @click="cancelTweak">取消</Button>
  </div>
</template>

<script setup name="batchGenerate">
import { ref, computed, h } from 'vue';
import { Message, Spin } from 'view-ui-plus';
import useSelect from '@/hooks/select';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const { canvasEditor, fabric } = useSelect();

const visible = ref(false);
const variables = ref([]);
const tableData = ref([]);
const isGenerating = ref(false);

const editingRowIndex = ref(-1);
const baseTemplateJson = ref(null);

const colSpan = computed(() => {
  if (variables.value.length === 0) return 24;
  return Math.max(4, Math.floor(24 / variables.value.length));
});

const open = (initialData) => {
  // 取得當下畫布 JSON 作為基礎模板並轉成字串，避免 Vue 深層響應式造成嚴重卡頓
  baseTemplateJson.value = JSON.stringify(canvasEditor.getJson());

  // 找出畫布中所有設定了 linkData[1] (變數名稱) 的物件，支援群組內遞迴尋找
  const vars = new Set();
  const collectVars = (objs) => {
    objs.forEach((obj) => {
      if (obj.linkData && obj.linkData[1]) {
        vars.add(obj.linkData[1]);
      }
      if (obj.type === 'group' && obj.getObjects) {
        collectVars(obj.getObjects());
      }
    });
  };
  collectVars(canvasEditor.canvas.getObjects());
  variables.value = Array.from(vars);

  tableData.value = [];

  // 如果有傳入初始資料 (從 URL 匯入的批次資料)
  if (initialData && Array.isArray(initialData) && initialData.length > 0) {
    // 收集所有在 initialData 中出現過的 Key，並把沒被加入 variables 的也加進去
    initialData.forEach((row) => {
      Object.keys(row).forEach((k) => {
        if (!variables.value.includes(k) && k !== 'customJson') {
          variables.value.push(k);
        }
      });
      tableData.value.push({ ...row, customJson: null });
    });
  } else if (variables.value.length > 0) {
    addRow();
  }

  visible.value = true;
};

const addRow = () => {
  const newRow = {};
  variables.value.forEach((v) => {
    newRow[v] = '';
  });
  newRow.customJson = null; // 紀錄是否有微調過的 JSON
  tableData.value.push(newRow);
};

const removeRow = (index) => {
  tableData.value.splice(index, 1);
};

const applyVariablesToCanvas = async (rowData) => {
  const processObjs = async (objs, parentGroup = null) => {
    let hasChanges = false;
    for (const obj of objs) {
      if (obj.type === 'group' && obj.getObjects) {
        const childChanged = await processObjs([...obj.getObjects()], obj);
        if (childChanged) {
          obj.addWithUpdate();
          obj.dirty = true;
          hasChanges = true;
        }
      }

      if (obj.linkData && obj.linkData[1] && rowData[obj.linkData[1]] !== undefined) {
        const val = rowData[obj.linkData[1]];
        const propName = obj.linkData[0] || (obj.type.includes('text') ? 'text' : 'src');

        if (propName === 'repeat') {
          const repeatCount = parseInt(val, 10);
          if (!isNaN(repeatCount)) {
            if (repeatCount <= 0) {
              if (parentGroup) {
                parentGroup.removeWithUpdate(obj);
                hasChanges = true;
              } else {
                canvasEditor.canvas.remove(obj);
              }
            } else if (repeatCount > 1) {
              const gapValue = 10;
              let currentLeft = obj.left + obj.getScaledWidth();
              const keys = canvasEditor.getExtensionKey ? canvasEditor.getExtensionKey() : [];

              for (let c = 1; c < repeatCount; c++) {
                await new Promise((resolveClone) => {
                  obj.clone((cloned) => {
                    cloned.set({
                      left: currentLeft + gapValue,
                      top: obj.top,
                    });
                    if (parentGroup) {
                      parentGroup.addWithUpdate(cloned);
                    } else {
                      canvasEditor.canvas.add(cloned);
                    }
                    currentLeft = cloned.left + cloned.getScaledWidth();
                    resolveClone();
                  }, keys);
                });
              }
              hasChanges = true;
            }
          }
        } else if (['i-text', 'textbox', 'text', 'vertical-textbox'].includes(obj.type)) {
          obj.set(propName, val);
          hasChanges = true;
        } else if (obj.type === 'image') {
          if (val && (val.startsWith('http') || val.startsWith('data:image'))) {
            // 記下原始的顯示尺寸
            const pw = obj.width * obj.scaleX;
            const ph = obj.height * obj.scaleY;

            await new Promise((resolve) => {
              obj.setSrc(
                val,
                (img) => {
                  // 算出 cover 的縮放比例
                  const s = Math.max(pw / img.width, ph / img.height);

                  // 裁切圖片，使其等比例填滿原佔位框
                  img.set({
                    scaleX: s,
                    scaleY: s,
                    width: pw / s,
                    height: ph / s,
                    cropX: (img.width - pw / s) / 2,
                    cropY: (img.height - ph / s) / 2,
                  });

                  // 若原圖片有設定圓角，必須重新計算 clipPath
                  if (img.roundValue && img.roundValue > 0) {
                    const scaleX = img.get('scaleX') || 1;
                    const scaleY = img.get('scaleY') || 1;

                    const w = img.width;
                    const h = img.height;
                    const rx = Math.max(0, Math.round(Number(img.roundValue) / scaleX));
                    const ry = Math.max(0, Math.round(Number(img.roundValue) / scaleY));

                    const x = -w / 2;
                    const y = -h / 2;
                    const r1 = Math.min(rx, w / 2);
                    const r2 = Math.min(ry, h / 2);

                    const pathString = `
                      M ${x + r1} ${y}
                      L ${x + w - r1} ${y}
                      A ${r1} ${r2} 0 0 1 ${x + w} ${y + r2}
                      L ${x + w} ${y + h - r2}
                      A ${r1} ${r2} 0 0 1 ${x + w - r1} ${y + h}
                      L ${x + r1} ${y + h}
                      A ${r1} ${r2} 0 0 1 ${x} ${y + h - r2}
                      L ${x} ${y + r2}
                      A ${r1} ${r2} 0 0 1 ${x + r1} ${y}
                      Z
                    `
                      .trim()
                      .replace(/\s+/g, ' ');

                    const rect = new fabric.Path(pathString, {
                      originX: 'center',
                      originY: 'center',
                      left: 0,
                      top: 0,
                      fill: '#000000',
                      absolutePositioned: false,
                    });
                    img.set('clipPath', rect);
                  }

                  if (parentGroup) {
                    parentGroup.addWithUpdate(img);
                    parentGroup.dirty = true;
                  }
                  hasChanges = true;
                  resolve();
                },
                { crossOrigin: 'anonymous' }
              );
            });
          }
        }
      }
    }
    return hasChanges;
  };

  await processObjs([...canvasEditor.canvas.getObjects()]);
};

const previewRow = async (index) => {
  editingRowIndex.value = index;
  visible.value = false;
  const rowData = tableData.value[index];

  Spin.show({ render: () => h('div', '載入預覽中...') });
  try {
    if (rowData.customJson) {
      // 載入之前微調過的版本
      await new Promise((resolve) => {
        canvasEditor.loadJSON(rowData.customJson, resolve);
      });
    } else {
      // 載入基礎模板
      await new Promise((resolve) => {
        canvasEditor.loadJSON(baseTemplateJson.value, resolve);
      });
      // 套用資料
      await applyVariablesToCanvas(rowData);
    }
    canvasEditor.canvas.requestRenderAll();
  } catch (error) {
    console.error(error);
  } finally {
    Spin.hide();
  }
};

const restoreAndReopen = async () => {
  Spin.show({ render: () => h('div', '復原預覽中...') });
  try {
    await new Promise((resolve) => {
      canvasEditor.loadJSON(baseTemplateJson.value, resolve);
    });
    editingRowIndex.value = -1;
    visible.value = true;
  } catch (error) {
    console.error(error);
  } finally {
    Spin.hide();
  }
};

const saveTweak = async () => {
  if (editingRowIndex.value !== -1) {
    tableData.value[editingRowIndex.value].customJson = JSON.stringify(canvasEditor.getJson());
  }
  await restoreAndReopen();
};

const cancelTweak = async () => {
  await restoreAndReopen();
};

const generateBatch = async () => {
  if (tableData.value.length === 0) return;
  isGenerating.value = true;
  Spin.show({ render: () => h('div', '批次產圖中，這可能需要一點時間...') });

  try {
    const zip = new JSZip();

    // 取得原始畫布 JSON 備份 (字串)
    const originalJsonStr = baseTemplateJson.value || JSON.stringify(canvasEditor.getJson());

    // 為了安全起見，我們使用主畫布進行替換後拍照，因為有文字字型載入的問題
    for (let i = 0; i < tableData.value.length; i++) {
      const rowData = tableData.value[i];

      if (rowData.customJson) {
        // 若有微調版，直接載入
        await new Promise((resolve) => {
          canvasEditor.loadJSON(rowData.customJson, resolve);
        });
      } else {
        // 載入原始畫布狀態
        await new Promise((resolve) => {
          canvasEditor.loadJSON(originalJsonStr, resolve);
        });
        // 替換變數
        await applyVariablesToCanvas(rowData);
      }

      // 觸發重新渲染
      canvasEditor.canvas.requestRenderAll();

      // 取得畫布圖片的原生 Blob (不經過 Base64 轉換)
      const blob = await canvasEditor.previewBlob();

      if (blob) {
        // 直接將 Blob 塞進 ZIP 裡，大幅節省記憶體與 Base64 轉換開銷
        zip.file(`batch_${i + 1}.png`, blob);
      }
    }

    // 復原原本的畫布
    await new Promise((resolve) => {
      canvasEditor.loadJSON(originalJsonStr, resolve);
    });

    // 打包與下載
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'batch_images.zip');
    Message.success('批次產圖成功！');
    visible.value = false;
  } catch (error) {
    console.error(error);
    Message.error('產圖失敗');
  } finally {
    isGenerating.value = false;
    Spin.hide();
  }
};

defineExpose({
  open,
});
</script>

<style scoped lang="less">
.data-rows {
  max-height: 400px;
  overflow-y: auto;
  padding-right: 10px;
}
.data-row {
  border: 1px solid #e8eaec;
  border-radius: 4px;
  padding: 10px;
  margin-bottom: 10px;
  background-color: #f8f8f9;
}
.row-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.tweak-bar {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  padding: 15px 30px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  z-index: 9999;
}
.tweak-info {
  margin-right: 20px;
  font-weight: bold;
  color: #2d8cf0;
  font-size: 16px;
}
</style>
