document.addEventListener('DOMContentLoaded', function() {
    const evaluationForm = document.getElementById('evaluationForm');
    const resultSection = document.getElementById('resultSection');
    const overallScore = document.getElementById('overallScore');
    const summary = document.getElementById('summary');
    const radarChart = echarts.init(document.getElementById('radarChart'));
    const barChart = echarts.init(document.getElementById('barChart'));
    const detailedScores = document.getElementById('detailedScores');

    console.log('页面加载完成，初始化表单和图表');

    if (!evaluationForm) {
        console.error('未找到评测表单元素');
        return;
    }

    evaluationForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const modelName = document.getElementById('modelName').value;
        console.log('提交评测请求，模型名称:', modelName);
        
        try {
            console.log('开始发送评测请求...');
            const response = await fetch('/evaluate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ modelName: modelName })
            });
            
            console.log('收到服务器响应，状态码:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('成功解析响应数据:', data);
            
            // 验证数据结构
            if (!data || !data.evaluation_results || !data.overall_score || !data.总结) {
                throw new Error('返回数据格式不正确');
            }
            
            displayResults(data);
        } catch (error) {
            console.error('评测请求失败:', error);
            alert('评测过程中出现错误，请稍后重试\n具体错误: ' + error.message);
        }
    });

    function displayResults(data) {
        resultSection.style.display = 'block';
        
        // 显示总分和总结
        overallScore.textContent = `总分：${data.overall_score}`;
        summary.textContent = data.总结;

        // 准备雷达图数据
        const dimensions = [];
        const values = [];
        try {
            Object.entries(data.evaluation_results).forEach(([key, value]) => {
                if (value && typeof value.total_score === 'number') {
                    dimensions.push(key);
                    values.push(value.total_score);
                }
            });
        } catch (error) {
            console.error('处理评分数据时出错:', error);
            alert('处理评分数据时出错，请检查数据格式');
            return;
        }

        // 配置雷达图
        const radarOption = {
            title: {
                text: '维度评分雷达图'
            },
            tooltip: {},
            radar: {
                indicator: dimensions.map(dim => ({
                    name: dim,
                    max: 30
                }))
            },
            series: [{
                type: 'radar',
                data: [{
                    value: values,
                    name: '评分'
                }]
            }]
        };
        radarChart.setOption(radarOption);

        // 配置柱状图
        const barOption = {
            title: {
                text: '维度评分柱状图'
            },
            tooltip: {},
            xAxis: {
                data: dimensions,
                axisLabel: {
                    interval: 0,
                    rotate: 45
                }
            },
            yAxis: {},
            series: [{
                type: 'bar',
                data: values
            }]
        };
        barChart.setOption(barOption);

        // 生成详细评分表格
        let tableHTML = '<table class="table table-bordered"><thead><tr><th>维度</th><th>子项</th><th>得分</th><th>描述</th></tr></thead><tbody>';
        
        Object.entries(data.evaluation_results).forEach(([dimension, details]) => {
            Object.entries(details).forEach(([item, itemDetails]) => {
                if (item !== 'total_score') {
                    tableHTML += `
                        <tr>
                            <td>${dimension}</td>
                            <td>${item}</td>
                            <td>${itemDetails.score}</td>
                            <td>${itemDetails.description}</td>
                        </tr>
                    `;
                }
            });
        });
        
        tableHTML += '</tbody></table>';
        detailedScores.innerHTML = tableHTML;
    }

    // 响应窗口大小变化，重绘图表
    window.addEventListener('resize', function() {
        radarChart.resize();
        barChart.resize();
    });
});