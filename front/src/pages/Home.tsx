export default function Home() {
	return (
		<div className="container" style={{ padding: '16px 0' }}>
			<h1 style={{ margin: 0, fontSize: 20 }}>Welcome to eco prompt</h1>
			<p style={{ opacity: 0.8 }}>
				메인 콘텐츠는 이 영역에서만 스크롤됩니다. 헤더/푸터는 고정됩니다.
			</p>
			<div style={{ height: 1200 }}>{/* 스크롤 테스트용 공간 */}</div>
		</div>
	);
}
