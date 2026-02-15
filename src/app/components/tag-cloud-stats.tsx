'use client';

import { useMemo, useState } from 'react';

interface TagStat {
  id: string;
  name: string;
  count: number;
}

interface TagStats {
  category: string;
  tags: TagStat[];
  peopleCount?: number;
}

// 类别显示名称映射
const categoryLabels: Record<string, string> = {
  SKILL: '技能',
  INDUSTRY: '行业',
  EDUCATION: '教育',
  EXPERIENCE: '经验',
  PERSONALITY: '性格特质',
};

// 类别颜色映射
const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  SKILL: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  INDUSTRY: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  EDUCATION: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  EXPERIENCE: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  PERSONALITY: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
};

// 每个类别最大显示数量
const MAX_TAGS: Record<string, number> = {
  SKILL: 30,        // 技能最多显示30个
  INDUSTRY: 15,
  EDUCATION: 15,
  EXPERIENCE: 15,
  PERSONALITY: 15,
};

// 计算字体大小 - 更加精细化的字体范围
function getFontSize(count: number, maxCount: number, minSize: number = 12, maxSize: number = 22): number {
  if (maxCount === 0) return minSize;
  const ratio = count / maxCount;
  return Math.round(minSize + ratio * (maxSize - minSize));
}

// 单个词云项组件
function CloudItem({
  name,
  count,
  maxCount,
  color
}: {
  name: string;
  count: number;
  maxCount: number;
  color: { bg: string; text: string };
}) {
  const fontSize = getFontSize(count, maxCount);
  const opacity = Math.max(0.6, Math.min(1, 0.5 + (count / maxCount) * 0.5));

  return (
    <span
      className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded cursor-pointer transition-all hover:scale-105 hover:shadow-sm ${color.bg} ${color.text}`}
      style={{
        fontSize: `${fontSize}px`,
        opacity,
        margin: '2px',
        lineHeight: 1.3,
      }}
      title={`${count} 人`}
    >
      {name}
      {count > 0 && <span className="ml-0.5 text-[10px] opacity-70">({count})</span>}
    </span>
  );
}

// 第二行小尺寸词云项
function SmallCloudItem({
  name,
  count,
  maxCount,
  color
}: {
  name: string;
  count: number;
  maxCount: number;
  color: { bg: string; text: string };
}) {
  const fontSize = getFontSize(count, maxCount, 9, 13);
  const opacity = Math.max(0.6, Math.min(1, 0.5 + (count / maxCount) * 0.5));

  return (
    <span
      className={`inline-flex items-center justify-center px-0.5 rounded cursor-pointer transition-all hover:scale-105 ${color.bg} ${color.text}`}
      style={{
        fontSize: `${fontSize}px`,
        opacity,
        margin: '1px',
        lineHeight: 1.1,
      }}
      title={`${count} 人`}
    >
      {name}
      {count > 0 && <span className="ml-0.5 opacity-60" style={{ fontSize: '7px' }}>({count})</span>}
    </span>
  );
}

// 词云区域组件（第二行，尺寸较小）
function CloudSection({
  category,
  tags,
  peopleCount = 0,
  maxShow = 10
}: {
  category: string;
  tags: TagStat[];
  peopleCount?: number;
  maxShow?: number;
}) {
  const colors = categoryColors[category] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };

  // 过滤有数据的标签，并限制显示数量
  const displayTags = useMemo(() => {
    return tags
      .filter(t => t.count > 0)
      .slice(0, maxShow);
  }, [tags, maxShow]);

  const maxCount = Math.max(...displayTags.map(t => t.count), 1);
  const hiddenCount = tags.filter(t => t.count > 0).length - displayTags.length;

  if (displayTags.length === 0) {
    return (
      <div className={`p-1 border rounded ${colors.border} bg-white`}>
        <h3 className={`text-[9px] font-semibold mb-0.5 ${colors.text}`}>
          {categoryLabels[category] || category}
        </h3>
        <p className="text-[9px] text-gray-400 text-center py-1">暂无数据</p>
      </div>
    );
  }

  return (
    <div className={`p-1 border rounded ${colors.border} bg-white`}>
      <div className="flex items-center justify-between mb-0.5">
        <h3 className={`text-[9px] font-semibold ${colors.text}`}>
          {categoryLabels[category] || category}
        </h3>
        <span className="text-[8px] text-muted-foreground">
          {peopleCount} 人
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-px min-h-[24px]">
        {displayTags.map((tag) => (
          <SmallCloudItem
            key={tag.id}
            name={tag.name}
            count={tag.count}
            maxCount={maxCount}
            color={colors}
          />
        ))}
      </div>
      {hiddenCount > 0 && (
        <p className="text-[8px] text-muted-foreground text-center mt-0.5">
          还有 {hiddenCount} 个...
        </p>
      )}
    </div>
  );
}

// 候选人群像组件
export default function TagCloudStats({
  data,
  totalPeople = 0,
  title = '标签统计'
}: {
  data: TagStats[];
  totalPeople?: number;
  title?: string;
}) {
  const [showAll, setShowAll] = useState(false);

  // 计算标签总数
  const totalTags = useMemo(() => {
    return data.reduce((acc, category) => {
      return acc + category.tags.filter(t => t.count > 0).length;
    }, 0);
  }, [data]);

  // 分离技能和其他类别
  const skillData = data.find(d => d.category === 'SKILL');
  const otherData = data.filter(d => d.category !== 'SKILL');

  const maxSkillShow = showAll ? 50 : MAX_TAGS.SKILL;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">{title}</h2>
          <span className="text-[10px] text-muted-foreground">
            ({totalPeople} 人 / {totalTags} 标签)
          </span>
        </div>
        <div className="flex items-center gap-2">
          {skillData && skillData.tags.filter(t => t.count > 0).length > MAX_TAGS.SKILL && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? '收起' : `全部 (${skillData.tags.filter(t => t.count > 0).length})`}
            </Button>
          )}
        </div>
      </div>

      <>
        {/* 技能单独占一行（标签最多，视觉焦点） */}
        {skillData && (
          <div className={`p-3 border rounded-lg ${categoryColors.SKILL.border} bg-white`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className={`text-xs font-semibold ${categoryColors.SKILL.text}`}>
                {categoryLabels.SKILL} ({skillData.tags.filter(t => t.count > 0).length})
              </h3>
              <span className="text-[10px] text-muted-foreground">
                {skillData.peopleCount ?? 0} 人
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1 min-h-[40px]">
              {skillData.tags
                .filter(t => t.count > 0)
                .slice(0, maxSkillShow)
                .map((tag) => {
                  const maxCount = Math.max(...skillData.tags.filter(t => t.count > 0).slice(0, maxSkillShow).map(t => t.count), 1);
                  return (
                    <CloudItem
                      key={tag.id}
                      name={tag.name}
                      count={tag.count}
                      maxCount={maxCount}
                      color={categoryColors.SKILL}
                    />
                  );
                })}
            </div>
            {skillData.tags.filter(t => t.count > 0).length > maxSkillShow && (
              <p className="text-[9px] text-muted-foreground text-center mt-1">
                还有 {skillData.tags.filter(t => t.count > 0).length - maxSkillShow} 个技能...
              </p>
            )}
          </div>
        )}

        {/* 其他四个类别一行（辅助信息，尺寸较小） */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
          {otherData.map((category) => (
            <CloudSection
              key={category.category}
              category={category.category}
              tags={category.tags}
              peopleCount={category.peopleCount}
              maxShow={MAX_TAGS[category.category] || 15}
            />
          ))}
        </div>
      </>
    </div>
  );
}

// 简单的 Button 组件（内联避免循环引用）
function Button({
  children,
  variant = 'default',
  size = 'default',
  onClick
}: {
  children: React.ReactNode;
  variant?: 'default' | 'outline';
  size?: 'default' | 'sm';
  onClick?: () => void;
}) {
  const baseClass = 'inline-flex items-center justify-center rounded font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50';

  const variantClass = variant === 'outline'
    ? 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
    : 'bg-primary text-primary-foreground hover:bg-primary/90';

  const sizeClass = size === 'sm' ? 'h-6 px-2 text-[10px]' : 'h-8 px-3 text-xs';

  return (
    <button className={`${baseClass} ${variantClass} ${sizeClass}`} onClick={onClick}>
      {children}
    </button>
  );
}
