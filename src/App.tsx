/* eslint-disable @typescript-eslint/no-explicit-any */
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@radix-ui/react-tooltip';
import { InfoIcon, Plus, Trash } from 'lucide-react';
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
import {
  GroupedResult,
  WoodPiece,
  optimizeCuts,
} from './utils/woodCutOptimizer';
import { DateTime } from 'luxon';

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
  // availableWood: yup.array().of(woodPieceSchema),
  // .min(1, 'Se requiere al menos una pieza de tabla disponible'),
  sawWidth: yup
    .number()
    .positive('El espesor de la sierra debe ser un número positivo')
    .typeError('El espesor de la sierra debe ser un número')
    .required('El espesor de la sierra es requerido'),
  errorPercentage: yup
    .number()
    .min(0, 'El porcentaje de error humano debe ser mayor o igual a 0')
    .max(100, 'El porcentaje de error humano debe ser menor o igual a 100')
    .typeError('El porcentaje de error humano debe ser un número')
    .required('El porcentaje de error humano es requerido'),
  woodLength: yup
    .number()
    .positive('La longitud de la tabla debe ser un número positivo')
    .typeError('La longitud de la tabla debe ser un número')
    .required('La longitud de la tabla es requerida'),
  wasteThreshold: yup
    .number()
    .min(0, 'El umbral de desperdicio debe ser mayor o igual a 0')
    .max(100, 'El umbral de desperdicio debe ser menor o igual a 100')
    .typeError('El umbral de desperdicio debe ser un número')
    .required('El umbral de desperdicio es requerido'),
});

type FormData = {
  desiredCuts: WoodPiece[];
  // availableWood: WoodPiece[];
  sawWidth: number;
  errorPercentage: number;
  woodLength: number;
  wasteThreshold: number;
};

const App: React.FC = () => {
  const [isTooltipOpen, setIsTooltipOpen] = React.useState(false);
  const [wasteTooltip, setWasteTooltip] = React.useState<
    Record<string, string>
  >({});
  const {
    register,
    control,
    handleSubmit,
    trigger,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      desiredCuts: [{ length: '' as any, quantity: '' as any }],
      // availableWood: [{ length: '' as any, quantity: '' as any }],
      sawWidth: 3,
      errorPercentage: 1,
      woodLength: 3962,
      wasteThreshold: 5,
    },
    resolver: yupResolver(formSchema) as Resolver<FormData>,
  });
  const wasteThreshold = watch('wasteThreshold');

  const {
    fields: desiredCutsFields,
    append: appendDesiredCut,
    remove: removeDesiredCut,
  } = useFieldArray({
    control,
    name: 'desiredCuts',
  });

  // const {
  //   // fields: availableWoodFields,
  //   append: appendAvailableWood,
  //   // remove: removeAvailableWood,
  // } = useFieldArray({
  //   control,
  //   name: 'availableWood',
  // });

  const [result, setResult] = React.useState<GroupedResult | null>(null);

  const desiredCutsRef = useRef<HTMLInputElement[]>([]);
  // const availableWoodRef = useRef<HTMLInputElement[]>([]);

  const resultRef = useRef<HTMLDivElement>(null);

  const handleKeyPress = async (
    event: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    // fieldArrayName: 'desiredCuts' | 'availableWood'
    fieldArrayName: 'desiredCuts'
  ) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const isValid = await trigger(`${fieldArrayName}.${index}`);
      if (isValid) {
        if (fieldArrayName === 'desiredCuts') {
          appendDesiredCut({ length: '' as any, quantity: '' as any });
          setTimeout(() => desiredCutsRef.current[index + 1]?.focus(), 0);
        } else {
          // appendAvailableWood({ length: '' as any, quantity: '' as any });
          // setTimeout(() => availableWoodRef.current[index + 1]?.focus(), 0);
        }
      }
    }
  };

  const onSubmit: SubmitHandler<FormData> = (data) => {
    const result = optimizeCuts(
      data.desiredCuts,
      undefined,
      data.sawWidth,
      data.errorPercentage / 100,
      data.woodLength
    );
    console.log(result, 'findMe');
    setResult(result);

    // New code to count cuts and log the result
    const cutCounts = result.cuts.reduce((acc, pattern) => {
      pattern.cuts.forEach((cut) => {
        acc[cut] = (acc[cut] || 0) + pattern.quantity;
      });
      return acc;
    }, {} as Record<number, number>);

    console.log('Cut counts:', cutCounts);

    // Scroll to the result table after a short delay
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const exportToExcel = () => {
    if (!result) return;

    const workbook = XLSX.utils.book_new();

    // Create a worksheet for the cutting patterns
    const patternsData = [
      [
        'Longitud de Tabla',
        'Cortes',
        'Cantidad',
        'Desperdicio',
        'Desperdicio Total',
      ],
      ...result.cuts.map((pattern) => [
        new Intl.NumberFormat('es-AR').format(pattern.originalLength),
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
          .map(
            ({ length, quantity }) =>
              `${new Intl.NumberFormat('es-AR').format(length)} (x${quantity})`
          )
          .join(', '),
        new Intl.NumberFormat('es-AR').format(pattern.remainingLength),
        pattern.quantity,
      ]),
      [
        'Total',
        new Intl.NumberFormat('es-AR').format(result.totalLengthUsed) + ' mm',
        result.cuts.reduce((acc, pattern) => acc + pattern.quantity, 0),
        '',
        new Intl.NumberFormat('es-AR').format(result.totalLengthTrashed) +
          ` mm (${(
            (result.totalLengthTrashed / result.totalLengthUsed) *
            100
          ).toFixed(2)}%)`,
      ],
    ];

    const patternsWs = XLSX.utils.aoa_to_sheet(patternsData);

    // Get current date and time in Argentine format using Luxon
    const now = DateTime.now().setZone('America/Argentina/Buenos_Aires');

    // Format date as day-month-year-hour-minutes-seconds
    const formattedDate = now.toFormat('dd/MM/yyyy HH:mm:ss');

    // Create a valid file name
    const fileName = `Cortes ${formattedDate}.xlsx`;

    XLSX.utils.book_append_sheet(workbook, patternsWs, 'Cortes');

    XLSX.writeFile(workbook, fileName);
  };

  return (
    <TooltipProvider>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">
          Optimizador de Cortes de Tabla
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="lg:flex lg:space-x-4">
            <Card className="mb-4 md:mb-0 lg:flex-1">
              <CardHeader>
                <CardTitle>Cortes Deseados</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-2">
                  Nota: La longitud debe ser en milímetros (mm)
                </p>
                {desiredCutsFields.map((field, index) => (
                  <div key={field.id} className="flex flex-col space-y-2 mb-4">
                    <div className="space-y-3 md:space-y-0 md:flex md:space-x-2">
                      <Input
                        {...register(`desiredCuts.${index}.length`)}
                        type="number"
                        placeholder="Longitud (mm)"
                        onKeyDown={(e) =>
                          handleKeyPress(e, index, 'desiredCuts')
                        }
                      />

                      <Input
                        {...register(`desiredCuts.${index}.quantity`)}
                        type="number"
                        placeholder="Cantidad"
                        onKeyDown={(e) =>
                          handleKeyPress(e, index, 'desiredCuts')
                        }
                      />

                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => removeDesiredCut(index)}>
                        <Trash />
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
                  <Plus />
                </Button>
              </CardContent>
            </Card>

            {/* <Card className="lg:flex-1">
              <CardHeader>
                <CardTitle>Tablas Disponibles</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-2">
                  Nota: La longitud debe ser en milímetros (mm)
                </p>
                {availableWoodFields.map((field, index) => (
                  <div key={field.id} className="flex flex-col space-y-2 mb-4">
                    <div className="space-y-3 md:space-y-0 md:flex md:space-x-2">
                      <Input
                        {...register(`availableWood.${index}.length`)}
                        type="number"
                        placeholder="Longitud (mm)"
                        onKeyDown={(e) =>
                          handleKeyPress(e, index, 'availableWood')
                        }
                      />
                      <Input
                        {...register(`availableWood.${index}.quantity`)}
                        type="number"
                        placeholder="Cantidad"
                        onKeyDown={(e) =>
                          handleKeyPress(e, index, 'availableWood')
                        }
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => removeAvailableWood(index)}>
                        <Trash />
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
                    appendAvailableWood({
                      length: '' as any,
                      quantity: '' as any,
                    })
                  }
                  className="mt-2">
                  <Plus />
                </Button>
              </CardContent>
            </Card> */}

            <Card className="flex-1">
              <CardHeader>
                <CardTitle>Configuración Adicional</CardTitle>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="sawWidth"
                      className="block text-sm font-medium text-gray-700 mb-1">
                      Espesor de la Sierra (mm)
                    </label>
                    <Input
                      {...register('sawWidth')}
                      type="number"
                      step="0.1"
                      id="sawWidth"
                    />
                    {errors.sawWidth && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.sawWidth.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="errorPercentage"
                      className="block text-sm font-medium text-gray-700 mb-1">
                      Porcentaje de Error Humano (%)
                    </label>
                    <Input
                      {...register('errorPercentage')}
                      type="number"
                      step="0.1"
                      id="errorPercentage"
                    />
                    {errors.errorPercentage && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.errorPercentage.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="woodLength"
                      className="block text-sm font-medium text-gray-700 mb-1">
                      Longitud de la Tabla (mm)
                    </label>
                    <Input
                      {...register('woodLength')}
                      type="number"
                      step="0.1"
                      id="woodLength"
                    />
                    {errors.woodLength && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.woodLength.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="wasteThreshold"
                      className="block text-sm font-medium text-gray-700 mb-1">
                      Umbral de Desperdicio (%)
                      <Tooltip
                        onOpenChange={() => setIsTooltipOpen(!isTooltipOpen)}
                        open={isTooltipOpen}>
                        <TooltipTrigger
                          onClick={() => setIsTooltipOpen(!isTooltipOpen)}
                          asChild>
                          <InfoIcon className="inline-block ml-1 h-4 w-4" />
                        </TooltipTrigger>

                        <TooltipContent className="max-w-72 bg-white p-2 rounded border border-gray-300 shadow-md">
                          <p>
                            El umbral de desperdicio determina el porcentaje
                            máximo de material que se puede desperdiciar sin
                            tener perdidas. Si una tabla supera este umbral, se
                            la mostrara en rojo.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </label>
                    <Input
                      {...register('wasteThreshold')}
                      type="number"
                      step="0.1"
                      id="wasteThreshold"
                    />
                    {errors.wasteThreshold && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.wasteThreshold.message}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Button type="submit">Calcular</Button>
        </form>

        {result && (
          <Card className="mt-8" ref={resultRef}>
            <CardHeader>
              <CardTitle>Resultados</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Longitud de Tabla</TableHead>
                    <TableHead>Cortes</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Desperdicio</TableHead>
                    <TableHead>Desperdicio Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.cuts.map((pattern, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {new Intl.NumberFormat('es-AR').format(
                          pattern.originalLength
                        )}
                      </TableCell>
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
                            ({ length, quantity }) =>
                              `${new Intl.NumberFormat('es-AR').format(
                                length
                              )} (x${quantity})`
                          )
                          .join(', ')}
                      </TableCell>
                      <TableCell>{pattern.quantity}</TableCell>
                      <TableCell>
                        <span
                          style={{
                            color:
                              pattern.waste >
                              (pattern.originalLength * wasteThreshold) / 100
                                ? 'red'
                                : 'inherit',
                          }}>
                          {new Intl.NumberFormat('es-AR').format(pattern.waste)}{' '}
                          mm por tabla
                          {pattern.waste >
                            (pattern.originalLength * wasteThreshold) / 100 && (
                            <>
                              <span
                                style={{
                                  marginLeft: '5px',
                                  fontSize: '0.8em',
                                }}>
                                (+
                                {new Intl.NumberFormat('es-AR').format(
                                  pattern.waste -
                                    (pattern.originalLength * wasteThreshold) /
                                      100
                                )}
                                )
                              </span>

                              <Tooltip
                                open={!!wasteTooltip?.[index]}
                                onOpenChange={() =>
                                  setWasteTooltip({
                                    ...wasteTooltip,
                                    [index]: !wasteTooltip?.[index],
                                  })
                                }
                                delayDuration={300}>
                                <TooltipTrigger
                                  onClick={() =>
                                    setWasteTooltip({
                                      ...wasteTooltip,
                                      [index]: !wasteTooltip?.[index],
                                    })
                                  }
                                  asChild>
                                  <InfoIcon className="h-4 w-4 ml-1 inline-block" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-72 bg-white p-2 rounded border border-gray-300 shadow-md">
                                  <p>
                                    El desperdicio excede el umbral establecido.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Intl.NumberFormat('es-AR').format(
                          pattern.waste * pattern.quantity
                        )}{' '}
                        mm
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell className="font-medium">Total</TableCell>
                    <TableCell className="font-medium"></TableCell>
                    <TableCell className="font-medium">
                      {result.numberOfWoodPiecesUsed} tabla
                      {result.numberOfWoodPiecesUsed !== 1 ? 's' : ''} usada
                      {result.numberOfWoodPiecesUsed !== 1 ? 's' : ''}
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell className="font-medium">
                      {new Intl.NumberFormat('es-AR').format(
                        result.totalLengthTrashed
                      )}{' '}
                      mm
                      <span className="text-xs font-medium ml-1">
                        (
                        {(
                          (result.totalLengthTrashed / result.totalLengthUsed) *
                          100
                        ).toFixed(2)}
                        %)
                      </span>
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
    </TooltipProvider>
  );
};

export default App;
