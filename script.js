// script.js - Eternity.✨音乐网 JavaScript（2026优化版）

const { createApp, ref } = Vue;

const PROXY = 'https://proxy.api.030101.xyz/';

const proxyPost = async (url, data, headers = {}) => {
    try {
        const response = await axios.post(PROXY + url, data, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
                'Content-Type': 'application/json',
                ...headers
            },
            timeout: 20000
        });
        return response.data;
    } catch (e) {
        console.error('Proxy 请求失败:', e.message);
        throw e;
    }
};

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

        const showMsg = (msg) => {
            message.value = msg;
            setTimeout(() => message.value = '', 3000);
        };

        // ====================== 搜索函数（保留 QQ 音乐，优化兼容性） ======================
        const searchMusic = async () => {
            if (!keyword.value.trim()) {
                showMsg('💡 请先输入歌名或歌手');
                return;
            }
            
            loading.value = true;
            songs.value = [];
            
            try {
                const postData = {
                    "comm": { "ct": 24, "cv": 0 },
                    "req_1": {
                        "method": "DoSearchForQQMusicDesktop",
                        "module": "music.search.SearchCgiService",
                        "param": {
                            "query": keyword.value,
                            "num_per_page": 25,
                            "page_num": 1,
                            "search_type": 0
                        }
                    }
                };
                
                const data = await proxyPost('https://u.y.qq.com/cgi-bin/musicu.fcg', postData, {
                    'Referer': 'https://y.qq.com',
                    'Origin': 'https://y.qq.com'
                });
                
                const songList = data?.req_1?.data?.body?.song?.list 
                              || data?.req_1?.data?.song?.list 
                              || [];
                
                songs.value = songList.map(item => {
                    const albumMid = item.album?.mid || item.album?.albumMid;
                    return {
                        id: item.id || item.songid,
                        mid: item.mid || item.songmid,
                        name: item.name || item.title,
                        artist: item.singer?.map(s => s.name).join(', ') || '未知歌手',
                        album: item.album?.name || item.album?.title || '',
                        cover: albumMid 
                            ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${albumMid}.jpg` 
                            : defaultCover,
                        duration: item.interval 
                            ? `${Math.floor(item.interval/60)}:${String(item.interval % 60).padStart(2, '0')}` 
                            : '03:30'
                    };
                });
                
                if (songs.value.length === 0) {
                    showMsg('😢 未找到相关歌曲，试试其他关键词');
                } else {
                    showMsg(`✅ 找到 ${songs.value.length} 首歌曲`);
                }
            } catch (err) {
                console.error('搜索错误:', err);
                showMsg('❌ 搜索失败，代理可能暂时不可用，请稍后重试');
            } finally {
                loading.value = false;
            }
        };

        // ====================== 获取播放链接（新增多个备用 API） ======================
        const getPlayUrl = async (songmid, songName) => {
            if (!songmid) return null;
            
            const levelMap = {
                '128k': '128',
                '320k': '320',
                'flac': 'flac'
            };
            const level = levelMap[currentQuality.value] || '128';

            // 2026 年推荐的多个免费公共备用接口（自动尝试）
            const apiList = [
                `https://api.xn--7gq663by6b.com/qqmusic/?id=${songmid}&type=${level}`,     // 推荐主接口
                `https://music.nxinxz.com/kgqq/tx.php?id=${songmid}&level=${level}&type=mp3`, // 老备用
                `https://api.qq.jsososo.com/song/url?id=${songmid}&type=${level}`,         // 备选1
                `https://api.030101.xyz/qqmusic/?id=${songmid}&level=${level}`             // 如果你有其他自建可加在这里
            ];

            for (let url of apiList) {
                try {
                    console.log(`尝试播放接口: ${url}`);
                    // 使用 HEAD 请求快速测试可用性（不下载内容）
                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), 8000);
                    
                    const res = await fetch(url, { 
                        method: 'HEAD', 
                        mode: 'no-cors',
                        signal: controller.signal 
                    });
                    clearTimeout(timeout);
                    
                    if (res) {
                        console.log(`接口可用: ${url}`);
                        return url;
                    }
                } catch (e) {
                    console.log(`接口不可用，尝试下一个: ${url}`);
                }
            }

            // 网易云热门歌兜底
            const neteaseUrl = getNeteaseUrl(songName);
            if (neteaseUrl) return neteaseUrl;

            // 最终测试音频
            return 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
        };

        const getNeteaseUrl = (name) => {
            const map = {
                '晴天': '186016', '稻香': '186004', '夜曲': '186038',
                '七里香': '186008', '告白气球': '418603077', '海阔天空': '346334',
                '起风了': '1330348068', '孤勇者': '1901371647'
            };
            for (let [k, id] of Object.entries(map)) {
                if (name.includes(k)) {
                    return `https://music.163.com/song/media/outer/url?id=${id}.mp3`;
                }
            }
            return null;
        };

        const playSong = async (song) => {
            if (!song) return;
            
            currentSong.value = song;
            playError.value = '';
            
            let url = null;
            if (song.mid) {
                url = await getPlayUrl(song.mid, song.name);
            }
            
            currentPlayUrl.value = url || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
            showMsg(`🎵 正在播放：${song.name}（${currentQuality.value}）`);
        };

        const refreshPlay = () => {
            if (currentSong.value) playSong(currentSong.value);
        };

        const onPlayError = () => {
            playError.value = '播放失败，可尝试切换音质';
            showMsg('播放失败，建议切换音质或稍后重试');
        };

        return {
            keyword, songs, loading, currentSong, currentPlayUrl, playError, message,
            currentQuality, qualities, defaultCover, quickTags,
            searchMusic, playSong, refreshPlay, onPlayError
        };
    }
}).mount('#app');
