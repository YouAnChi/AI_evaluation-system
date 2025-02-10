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

        // 准备图表数据
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
                text: '维度评分雷达图',
                textStyle: {
                    fontSize: 16,
                    fontWeight: 'bold'
                }
            },
            tooltip: {
                trigger: 'item'
            },
            radar: {
                indicator: dimensions.map(dim => ({
                    name: dim,
                    max: 30
                })),
                splitArea: {
                    show: true,
                    areaStyle: {
                        color: ['rgba(250,250,250,0.3)', 'rgba(200,200,200,0.3)']
                    }
                }
            },
            series: [{
                type: 'radar',
                data: [{
                    value: values,
                    name: '评分',
                    areaStyle: {
                        color: 'rgba(65,105,225,0.4)'
                    },
                    lineStyle: {
                        width: 2
                    }
                }],
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowColor: 'rgba(0,0,0,0.3)'
                    }
                }
            }]
        };
        radarChart.setOption(radarOption);

        // 配置柱状图
        const barOption = {
            title: {
                text: '维度评分柱状图',
                textStyle: {
                    fontSize: 16,
                    fontWeight: 'bold'
                }
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'shadow'
                }
            },
            xAxis: {
                data: dimensions,
                axisLabel: {
                    interval: 0,
                    rotate: 45
                }
            },
            yAxis: {
                name: '得分'
            },
            series: [{
                type: 'bar',
                data: values.map(value => ({
                    value: value,
                    itemStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            {offset: 0, color: '#83bff6'},
                            {offset: 0.5, color: '#188df0'},
                            {offset: 1, color: '#188df0'}
                        ])
                    }
                })),
                emphasis: {
                    itemStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            {offset: 0, color: '#2378f7'},
                            {offset: 0.7, color: '#2378f7'},
                            {offset: 1, color: '#83bff6'}
                        ])
                    }
                },
                barWidth: '40%',
                showBackground: true,
                backgroundStyle: {
                    color: 'rgba(220, 220, 220, 0.8)'
                }
            }]
        };
        barChart.setOption(barOption);

        // 配置饼图
        const pieChart = echarts.init(document.getElementById('pieChart'));
        const pieOption = {
            title: {
                text: '维度得分占比',
                textStyle: {
                    fontSize: 16,
                    fontWeight: 'bold'
                }
            },
            tooltip: {
                trigger: 'item',
                formatter: '{a} <br/>{b}: {c} ({d}%)'
            },
            legend: {
                orient: 'vertical',
                right: 10,
                top: 'center'
            },
            series: [{
                name: '得分占比',
                type: 'pie',
                radius: ['50%', '70%'],
                avoidLabelOverlap: true,
                itemStyle: {
                    borderRadius: 10,
                    borderColor: '#fff',
                    borderWidth: 2
                },
                label: {
                    show: false,
                    position: 'center'
                },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: '20',
                        fontWeight: 'bold'
                    }
                },
                labelLine: {
                    show: false
                },
                data: dimensions.map((dim, index) => ({
                    value: values[index],
                    name: dim
                }))
            }]
        };
        pieChart.setOption(pieOption);

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
        pieChart.resize();
    });
});