import { useState } from 'react';
import { Printer, FileText, ClipboardCheck, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Props {
  /** Print the activity content */
  onPrintActivity: () => void;
  /** Print the answer key / gabarito */
  onPrintGabarito?: () => void;
  /** Print the BNCC pedagogical sheet */
  onPrintBncc?: () => void;
  className?: string;
}

export default function PrintOptionsMenu({
  onPrintActivity,
  onPrintGabarito,
  onPrintBncc,
  className,
}: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Printer size={14} />
          Imprimir
          <ChevronDown size={12} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onPrintActivity} className="gap-2">
          <FileText size={14} />
          Imprimir Atividade
        </DropdownMenuItem>
        {onPrintGabarito && (
          <DropdownMenuItem onClick={onPrintGabarito} className="gap-2">
            <ClipboardCheck size={14} />
            Imprimir Gabarito
          </DropdownMenuItem>
        )}
        {onPrintBncc && (
          <DropdownMenuItem onClick={onPrintBncc} className="gap-2">
            <ClipboardCheck size={14} />
            Imprimir Ficha BNCC
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
