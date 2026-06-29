import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import LZString from 'lz-string';
import { getLocalTemplates } from '@/utils/localDB';

export default function useUrlData(canvasEditor: any) {
  const route = useRoute();

  onMounted(async () => {
    if (!canvasEditor) return;

    // 如果網址列帶有 localId，則先載入本地模板
    if (route.query.localId) {
      try {
        const localTemplates = await getLocalTemplates();
        const localTmpl = localTemplates.find((t: any) => t.id === route.query.localId);
        if (localTmpl && localTmpl.json) {
          await new Promise<void>((resolve) => {
            canvasEditor.loadJSON(localTmpl.json, resolve);
          });
        }
      } catch (error) {
        console.error('載入本地模板失敗:', error);
      }
    }

    // 處理 data 參數
    if (route.query.data) {
      try {
        const decompressed = LZString.decompressFromEncodedURIComponent(route.query.data as string);
        if (!decompressed) {
          throw new Error('解壓縮失敗，可能資料已損毀或格式錯誤');
        }

        const parsedData = JSON.parse(decompressed);

        // 如果模板尚未載入完成 (因為可能有雲端或本地的非同步讀取)，
        // 我們監聽 'loadJson' 事件，確保畫布準備好再注入變數。
        // 但如果此時畫布已經載入完了 (例如使用者一打開時並沒有指定 tempId 或 localId)，
        // 就直接執行注入邏輯。
        const injectData = async () => {
          if (Array.isArray(parsedData)) {
            // 陣列模式：開啟批次產生視窗
            canvasEditor.emit('openBatchGenerate', parsedData);
          } else if (typeof parsedData === 'object' && parsedData !== null) {
            // 單一模式：將單一資料轉換為陣列，統一使用「批次產生」的預覽視窗，避免直接破壞原模板
            canvasEditor.emit('openBatchGenerate', [parsedData]);
          }
        };

        // 如果有指定 tempId，importTmpl 稍後才會發出 loadJson，所以我們監聽它
        // 因為 localId 上方是用 await 等待載入完成，如果是 localId 我們其實已經載入了
        // 為了安全起見，如果有 tempId 我們監聽 loadJson，否則可以直接執行。
        if (route.query.tempId) {
          const handleLoadJson = () => {
            injectData();
            canvasEditor.off('loadJson', handleLoadJson);
          };
          canvasEditor.on('loadJson', handleLoadJson);
        } else {
          // 對於 localId 或沒有指定模板 (在當下畫布操作)，直接執行注入
          injectData();
        }
      } catch (error) {
        console.error('URL Data 解析或替換失敗:', error);
      }
    }
  });
}
