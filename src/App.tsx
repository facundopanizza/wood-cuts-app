/* eslint-disable @typescript-eslint/no-explicit-any */
import { yupResolver } from '@hookform/resolvers/yup';
import React, { useRef } from 'react';
import {
  Resolver,
  SubmitHandler,
  useFieldArray,
  useForm,
} from 'react-hook-form';
import * as XLSX from 'xlsx';
import * as yup from 'yup';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './components/ui/table';
import { Result, WoodPiece, optimizeCuts } from './utils/woodCutOptimizer';

const woodPieceSchema = yup.object().shape({
  length: yup
    .number()
    .positive('La longitud debe ser un número positivo')
    .typeError('La longitud debe ser un número')
    .required('La longitud es requerida'),
  quantity: yup
    .number()
    .integer()
    .positive('La cantidad debe ser un número entero positivo')
    .typeError('La cantidad debe ser un número entero')
    .required('La cantidad es requerida'),
});

const formSchema = yup.object().shape({
  desiredCuts: yup
    .array()
    .of(woodPieceSchema)
    .min(1, 'Se requiere al menos un corte deseado'),
  availableWood: yup
    .array()
    .of(woodPieceSchema)
    .min(1, 'Se requiere al menos una pieza de table disponible'),
});

type FormData = {
  desiredCuts: WoodPiece[];
  availableWood: WoodPiece[];
};

const App: React.FC = () => {
  const {
    register,
    control,
    handleSubmit,
    trigger,
    formState: { errors },
    watch,
  } = useForm<FormData>({
    defaultValues: {
      desiredCuts: [{ length: '' as any, quantity: '' as any }],
      availableWood: [{ length: '' as any, quantity: '' as any }],
    },
    resolver: yupResolver(formSchema) as Resolver<FormData>,
  });

  console.log(watch());

  const {
    fields: desiredCutsFields,
    append: appendDesiredCut,
    remove: removeDesiredCut,
  } = useFieldArray({
    control,
    name: 'desiredCuts',
  });

  const {
    fields: availableWoodFields,
    append: appendAvailableWood,
    remove: removeAvailableWood,
  } = useFieldArray({
    control,
    name: 'availableWood',
  });

  const [result, setResult] = React.useState<Result | null>(null);

  const desiredCutsRef = useRef<HTMLInputElement[]>([]);
  const availableWoodRef = useRef<HTMLInputElement[]>([]);

  const handleKeyPress = async (
    event: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    fieldArrayName: 'desiredCuts' | 'availableWood'
  ) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const isValid = await trigger(`${fieldArrayName}.${index}`);
      if (isValid) {
        if (fieldArrayName === 'desiredCuts') {
          appendDesiredCut({ length: '' as any, quantity: '' as any });
          setTimeout(() => desiredCutsRef.current[index + 1]?.focus(), 0);
        } else {
          appendAvailableWood({ length: '' as any, quantity: '' as any });
          setTimeout(() => availableWoodRef.current[index + 1]?.focus(), 0);
        }
      }
    }
  };

  const onSubmit: SubmitHandler<FormData> = (data) => {
    const result = optimizeCuts(data.desiredCuts, data.availableWood);
    console.log(result);
    setResult(result);
  };

  const exportToExcel = () => {
    if (!result) return;

    const workbook = XLSX.utils.book_new();

    // Create a worksheet for the cutting patterns
    const patternsData = [
      ['Longitud de Tabla', 'Cortes', 'Desperdicio'],
      ...result.cuts.map((pattern) => [
        pattern.woodUsed,
        pattern.cuts
          .reduce((acc, cut) => {
            const existingCut = acc.find((item) => item.length === cut);
            if (existingCut) {
              existingCut.quantity += 1;
            } else {
              acc.push({ length: cut, quantity: 1 });
            }
            return acc;
          }, [] as { length: number; quantity: number }[])
          .map(({ length, quantity }) => `${length} (x${quantity})`)
          .join(', '),
        pattern.woodUsed - pattern.cuts.reduce((prev, curr) => prev + curr, 0),
      ]),
      ['Total', result.totalLengthUsed, result.totalLengthTrashed],
    ];
    const patternsWs = XLSX.utils.aoa_to_sheet(patternsData);
    XLSX.utils.book_append_sheet(workbook, patternsWs, 'Patrones de Corte');

    XLSX.writeFile(workbook, 'resultados_cortes_madera.xlsx');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">
        Optimizador de Cortes de Tabla
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Cortes Deseados</CardTitle>
          </CardHeader>
          <CardContent>
            {desiredCutsFields.map((field, index) => (
              <div key={field.id} className="flex flex-col space-y-2 mb-4">
                <div className="flex space-x-2">
                  <Input
                    {...register(`desiredCuts.${index}.length`)}
                    type="number"
                    placeholder="Longitud"
                    onKeyDown={(e) => handleKeyPress(e, index, 'desiredCuts')}
                  />
                  <Input
                    {...register(`desiredCuts.${index}.quantity`)}
                    type="number"
                    placeholder="Cantidad"
                    onKeyDown={(e) => handleKeyPress(e, index, 'desiredCuts')}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => removeDesiredCut(index)}>
                    Eliminar
                  </Button>
                </div>
                {errors.desiredCuts?.[index]?.length && (
                  <p className="text-red-500 text-sm">
                    {errors.desiredCuts[index]?.length?.message}
                  </p>
                )}
                {errors.desiredCuts?.[index]?.quantity && (
                  <p className="text-red-500 text-sm">
                    {errors.desiredCuts[index]?.quantity?.message}
                  </p>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                appendDesiredCut({ length: '' as any, quantity: '' as any })
              }
              className="mt-2">
              Agregar Corte Deseado
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tabla Disponible</CardTitle>
          </CardHeader>
          <CardContent>
            {availableWoodFields.map((field, index) => (
              <div key={field.id} className="flex flex-col space-y-2 mb-4">
                <div className="flex space-x-2">
                  <Input
                    {...register(`availableWood.${index}.length`)}
                    type="number"
                    placeholder="Longitud"
                    onKeyDown={(e) => handleKeyPress(e, index, 'availableWood')}
                  />
                  <Input
                    {...register(`availableWood.${index}.quantity`)}
                    type="number"
                    placeholder="Cantidad"
                    onKeyDown={(e) => handleKeyPress(e, index, 'availableWood')}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => removeAvailableWood(index)}>
                    Eliminar
                  </Button>
                </div>
                {errors.availableWood?.[index]?.length && (
                  <p className="text-red-500 text-sm">
                    {errors.availableWood[index]?.length?.message}
                  </p>
                )}
                {errors.availableWood?.[index]?.quantity && (
                  <p className="text-red-500 text-sm">
                    {errors.availableWood[index]?.quantity?.message}
                  </p>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                appendAvailableWood({ length: '' as any, quantity: '' as any })
              }
              className="mt-2">
              Agregar Tabla Disponible
            </Button>
          </CardContent>
        </Card>

        <Button type="submit">Calcular</Button>
      </form>

      {result && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Resultados</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Longitud de Tabla</TableHead>
                  <TableHead>Cortes</TableHead>
                  <TableHead>Desperdicio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.cuts.map((pattern, index) => (
                  <TableRow key={index}>
                    <TableCell>{pattern.woodUsed}</TableCell>
                    <TableCell>
                      {pattern.cuts
                        .reduce((acc, cut) => {
                          const existingCut = acc.find(
                            (item) => item.length === cut
                          );
                          if (existingCut) {
                            existingCut.quantity += 1;
                          } else {
                            acc.push({ length: cut, quantity: 1 });
                          }
                          return acc;
                        }, [] as { length: number; quantity: number }[])
                        .map(
                          ({ length, quantity }) => `${length} (x${quantity})`
                        )
                        .join(', ')}
                    </TableCell>
                    <TableCell>
                      {pattern.woodUsed -
                        pattern.cuts.reduce((prev, curr) => prev + curr, 0)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell className="font-medium">Total</TableCell>
                  <TableCell className="font-medium">
                    {result.totalLengthUsed}
                  </TableCell>
                  <TableCell className="font-medium">
                    {result.totalLengthTrashed}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <Button onClick={exportToExcel} className="mt-4">
              Exportar a Excel
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default App;
