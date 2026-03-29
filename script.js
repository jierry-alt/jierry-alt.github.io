const { createApp, ref } = Vue;

const PROXY = 'https://proxy.api.030101.xyz/';

const proxyPost = async (url, data, headers = {}) => {
    const response = await axios.post(PROXY + url, data, {
        headers: {
            'User-Agent': 'Mozilla/5.0',
            'Content-Type': 'application/json',
            ...headers
        },
        timeout: 15000
    });
    return response.data;
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
            setTimeout(() => message.value = '', 2000);
        };

        const searchMusic = async () => {
            if (!keyword.value.trim()) {
                showMsg('💡 输入歌名或歌手再搜索吧');
                return;
            }
            
            loading.value = true;
            songs.value = [];
            
            try {
                const postData = {
                    req_1: {
                        method: "DoSearchForQQMusicDesktop",
                        module: "music.search.SearchCgiService",
                        param: {
                            num_per_page: 25,
                            page_num: 1,
                            query: keyword.value,
                            search_type: 0
                        }
                    }
                };
                
                const data = await proxyPost('https://u.y.qq.com/cgi-bin/musicu.fcg', postData, {
                    'Referer': 'https://y.qq.com'
                });
                
                const songList = data?.req_1?.data?.body?.song?.list || [];
                
                songs.value = songList.map(item => {
                    const albumMid = item.album?.mid;
                    return {
                        id: item.id,
                        mid: item.mid,
                        name: item.name,
                        artist: item.singer?.map(s => s.name).join(', ') || '未知歌手',
                        album: item.album?.name || '',
                        cover: albumMid ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${albumMid}.jpg` : defaultCover,
                        duration: item.interval ? `${Math.floor(item.interval/60)}:${String(item.interval%60).padStart(2,'0')}` : '03:30'
                    };
                });
                
                if (songs.value.length === 0) {
                    showMsg('😢 未找到相关歌曲，试试其他关键词');
                } else {
                    showMsg(`✨ 找到 ${songs.value.length} 首歌曲`);
                }
                
            } catch (err) {
                console.error('搜索错误:', err);
                showMsg('搜索失败，请稍后重试');
            } finally {
                loading.value = false;
            }
        };
        
        const getPlayUrl = async (songmid) => {
            if (!songmid) return null;
            
            try {
                const qualityMap = {
                    '128k': 'standard',
                    '320k': 'exhigh', 
                    'flac': 'lossless'
                };
                const level = qualityMap[currentQuality.value];
                return `https://music.nxinxz.com/kgqq/tx.php?id=${songmid}&level=${level}&type=mp3`;
            } catch (err) {
                console.error('获取播放链接失败:', err);
                return null;
            }
        };
        
        const getNeteaseUrl = (name) => {
            const map = {
                '晴天': '186016', '稻香': '186004', '夜曲': '186038',
                '七里香': '186008', '告白气球': '418603077', '海阔天空': '346334',
                '起风了': '1330348068', '孤勇者': '1901371647'
            };
            for (let [k, id] of Object.entries(map)) {
                if (name.includes(k)) return `https://music.163.com/song/media/outer/url?id=${id}.mp3`;
            }
            return null;
        };
        
        const playSong = async (song) => {
            if (!song) return;
            
            currentSong.value = song;
            playError.value = '';
            
            let url = null;
            
            if (song.mid) {
                url = await getPlayUrl(song.mid);
            }
            
            if (!url) {
                url = getNeteaseUrl(song.name);
            }
            
            if (!url) {
                url = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
            }
            
            currentPlayUrl.value = url;
            showMsg(`🎵 正在播放: ${song.name}`);
        };
        
        const refreshPlay = () => {
            if (currentSong.value) playSong(currentSong.value);
        };
        
        const onPlayError = () => {
            playError.value = '播放失败，可尝试切换音质';
        };
        
        return {
            keyword, songs, loading, currentSong, currentPlayUrl, playError, message,
            currentQuality, qualities, defaultCover, quickTags,
            searchMusic, playSong, refreshPlay, onPlayError
        };
    }
}).mount('#app');