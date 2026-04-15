// script.js - Eternity.✨音乐网（2026 元力插件版 - 多音源）

const { createApp, ref } = Vue;

createApp({
    setup() {
        const keyword = ref('');
        const songs = ref([]);
        const loading = ref(false);
        const currentSong = ref(null);
        const currentPlayUrl = ref('');
        const playError = ref('');
        const message = ref('');
        const currentQuality = ref('128k');
        
        const defaultCover = 'https://y.gtimg.cn/music/photo_new/T002R300x300M000000MkMni19ClKG.jpg';
        
        const qualities = [
            { value: '128k', label: '标准' },
            { value: '320k', label: '高品质' },
            { value: 'flac', label: '无损' }
        ];
        
        const quickTags = ['晴天', '稻香', '夜曲', '七里香', '告白气球', '海阔天空', '起风了', '孤勇者'];

        // 元力插件加载状态
        const pluginsLoaded = ref(false);
        let qqPlugin = null;   // QQ 元力插件
        let wyPlugin = null;   // 网易元力插件

        const showMsg = (msg) => {
            message.value = msg;
            setTimeout(() => message.value = '', 3000);
        };

        // ====================== 动态加载元力插件 ======================
        const loadYuanliPlugins = async () => {
            if (pluginsLoaded.value) return;
            
            try {
                // 加载 QQ 元力插件
                const qqScript = document.createElement('script');
                qqScript.src = 'https://13413.kstore.vip/yuanli/qq.js';
                document.head.appendChild(qqScript);
                
                // 加载网易元力插件（备用）
                const wyScript = document.createElement('script');
                wyScript.src = 'https://13413.kstore.vip/yuanli/wy.js';
                document.head.appendChild(wyScript);

                // 等待插件加载（简单延时，实际项目可优化为 onload）
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                // 尝试获取插件（元力插件通常暴露在 window 上）
                qqPlugin = window.qq || null;   // 根据实际插件暴露的变量调整
                wyPlugin = window.wy || null;
                
                pluginsLoaded.value = true;
                console.log('✅ 元力插件加载成功', { qq: !!qqPlugin, wy: !!wyPlugin });
            } catch (e) {
                console.error('插件加载失败:', e);
                showMsg('插件加载失败，使用备用模式');
            }
        };

        // ====================== 搜索（优先使用元力 QQ 插件，其次网易云） ======================
        const searchMusic = async () => {
            if (!keyword.value.trim()) {
                showMsg('💡 请先输入歌名或歌手');
                return;
            }
            
            loading.value = true;
            songs.value = [];
            
            await loadYuanliPlugins();   // 确保插件已加载
            
            try {
                let songList = [];
                
                // 优先使用元力 QQ 插件搜索
                if (qqPlugin && typeof qqPlugin.search === 'function') {
                    console.log('使用元力 QQ 插件搜索');
                    const result = await qqPlugin.search(keyword.value, 1, 'music');
                    songList = result?.data || [];
                } 
                // 备用：网易云 weapi
                else {
                    console.log('插件不可用，使用网易云备用搜索');
                    const res = await axios.post('https://music.163.com/weapi/cloudsearch/get/web', {
                        s: keyword.value,
                        type: 1,
                        limit: 30,
                        offset: 0
                    }, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Referer': 'https://music.163.com/'
                        }
                    });
                    songList = res.data?.result?.songs || [];
                }
                
                songs.value = songList.map(item => ({
                    id: item.id || item.songmid,
                    mid: item.songmid || item.id,
                    name: item.name || item.title,
                    artist: (item.artist || item.singer || item.ar || []).map(a => a.name || a).join(', ') || '未知歌手',
                    album: item.album?.name || item.album || '',
                    cover: item.cover || item.pic || defaultCover,
                    duration: item.duration 
                        ? `${Math.floor(item.duration/60)}:${String(item.duration%60).padStart(2,'0')}` 
                        : '03:30'
                }));
                
                if (songs.value.length === 0) {
                    showMsg('😢 未找到歌曲，试试其他关键词');
                } else {
                    showMsg(`✅ 找到 ${songs.value.length} 首歌曲`);
                }
            } catch (err) {
                console.error('搜索错误:', err);
                showMsg('❌ 搜索失败，请稍后重试');
            } finally {
                loading.value = false;
            }
        };

        // ====================== 播放链接（优先念心 + 元力 QQ + 网易云） ======================
        const getPlayUrl = async (song) => {
            if (!song.mid && !song.id) return null;

            const songmid = song.mid || song.id;
            const levelMap = { '128k': '128', '320k': '320', 'flac': 'flac' };
            const level = levelMap[currentQuality.value] || '128';

            const apiList = [
                // 1. 你的念心 QQ 音源（最推荐）
                `https://music.nxinxz.com/kgqq/tx.php?id=${songmid}&level=${level}&type=mp3`,
                
                // 2. 元力 QQ 插件获取（如果插件可用）
                ...(qqPlugin && typeof qqPlugin.getMediaSource === 'function' 
                    ? [() => qqPlugin.getMediaSource(song, currentQuality.value)] : []),
                
                // 3. 网易云外链兜底
                `https://music.163.com/song/media/outer/url?id=${songmid}.mp3`
            ];

            for (let api of apiList) {
                try {
                    let url = typeof api === 'function' ? await api() : api;
                    if (url && typeof url === 'string') {
                        console.log(`使用音源: ${url}`);
                        return url.url || url;   // 兼容插件返回 {url}
                    }
                } catch (e) {
                    console.log('当前音源失败，继续下一个');
                }
            }
            
            return 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
        };

        const playSong = async (song) => {
            if (!song) return;
            
            currentSong.value = song;
            playError.value = '';
            
            const url = await getPlayUrl(song);
            currentPlayUrl.value = url;
            
            showMsg(`🎵 正在播放：${song.name}（${currentQuality.value}）`);
        };

        const refreshPlay = () => {
            if (currentSong.value) playSong(currentSong.value);
        };

        const onPlayError = () => {
            playError.value = '播放失败，可尝试切换音质';
            showMsg('播放失败，建议切换音质或换一首歌');
        };

        // 页面加载时尝试加载插件
        loadYuanliPlugins();

        return {
            keyword, songs, loading, currentSong, currentPlayUrl, playError, message,
            currentQuality, qualities, defaultCover, quickTags,
            searchMusic, playSong, refreshPlay, onPlayError
        };
    }
}).mount('#app');
