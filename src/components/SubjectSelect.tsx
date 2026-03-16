import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SUBJECT_CATEGORIES, getSubjectIcon } from '@/lib/subjects-data';

interface SubjectOption {
  id: string;
  name: string;
  color?: string;
}

interface Props {
  value: string;
  onValueChange: (value: string) => void;
  subjects: SubjectOption[];
  placeholder?: string;
  showAll?: boolean; // show "Todas Disciplinas" option
}

export default function SubjectSelect({ value, onValueChange, subjects, placeholder = 'Selecione...', showAll = false }: Props) {
  // Group subjects by category based on name matching
  const categorized = SUBJECT_CATEGORIES.map(cat => ({
    label: cat.label,
    items: subjects.filter(s => cat.subjects.some(cs => cs.name === s.name)),
  })).filter(g => g.items.length > 0);

  // Subjects that don't match any category
  const uncategorized = subjects.filter(s =>
    !SUBJECT_CATEGORIES.some(cat => cat.subjects.some(cs => cs.name === s.name))
  );

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="min-h-[44px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {showAll && <SelectItem value="all">Todas Disciplinas</SelectItem>}
        {categorized.map(group => (
          <SelectGroup key={group.label}>
            <SelectLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">
              {group.label}
            </SelectLabel>
            {group.items.map(s => (
              <SelectItem key={s.id} value={s.id}>
                <span className="flex items-center gap-2">
                  <span>{getSubjectIcon(s.name)}</span>
                  <span>{s.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
        {uncategorized.length > 0 && (
          <SelectGroup>
            <SelectLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">
              📁 Personalizadas
            </SelectLabel>
            {uncategorized.map(s => (
              <SelectItem key={s.id} value={s.id}>
                <span className="flex items-center gap-2">
                  <span>{getSubjectIcon(s.name)}</span>
                  <span>{s.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  );
}
