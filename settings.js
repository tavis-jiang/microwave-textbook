// 设置在首屏绘制前生效，localStorage禁用时仍可阅读。
try{document.documentElement.dataset.theme=localStorage.getItem('microwave-theme')||'light';document.documentElement.dataset.font=localStorage.getItem('microwave-font')||'normal';}catch{}
